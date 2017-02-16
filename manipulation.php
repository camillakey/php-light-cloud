<?php
require_once 'path.php';

$key_length = 32;

$status = array('status' => 1);
$manip = isset($_POST['manip']) ? $_POST['manip'] : null;
switch($manip) {
	case 'upload':
		$status = uploadFile();
		break;
	case 'download':
		$status = downloadFile();
		break;
	case 'view':
		$status = viewFile();
		break;
	case 'delete':
		$status = deleteFile();
		break;
	case 'rename':
		$status = renameFile();
		break;
	case 'fileinfo':
		$status = fileinfo();
		break;
}

echo to_json($status);



function uploadFile() {
	global $datadir;
	
	$uploadTarget = function($tmp_name, $name) use(&$datadir) {
		$key = generate_key();
		$path = $datadir . '/' . $key;
		
		return (move_uploaded_file($tmp_name, $path) && add_association($key, $name));
	};
	
	$res = array('status' => 0);
	if(isset($_FILES['target'])) {
		if(is_array($_FILES['target']['error'])) {
			foreach($_FILES['target']['error'] as $key => $error) {
				if($error == UPLOAD_ERR_OK) {
					if(!$uploadTarget($_FILES['target']['tmp_name'][$key],
							$_FILES['target']['name'][$key])) {
						$res['status'] = 1;
					}
				}
			}
		} else {
			if(!$uploadTarget($_FILES['target']['tmp_name'], $_FILES['target']['name'])) {
				$res['status'] = 1;
			}
		}
	}
	
	return $res;
}

function downloadFile() {
	global $datadir;
	
	if(isset($_POST['target'])) {
		if(is_array($_POST['target'])) {
			/* TODO: Zip Download Progress */
		} else {
			$key = $_POST['target'];
			$value = get_association_value($key);
			
			if($value !== false) {
				$path = $datadir . '/' . $key;
				
				header('Content-Description: File Transfer');
				header('Content-Type: application/octet-stream');
				header('Content-Disposition: attachment; filename="' . $value . '"');
				header('Expires: 0');
				header('Cache-Control: must-revalidate');
				header('Pragma: public');
				header('Content-Length: ' . filesize($path));
				readfile($path);
			}
		}
	}
	
	exit;
}

function viewFile() {
	global $datadir;
	
	if(isset($_POST['target']) && !is_array($_POST['target'])) {
		$key = $_POST['target'];
		$value = get_association_value($key);
		
		if($value !== false) {
			$path = $datadir . '/' . $key;
			
			header('Content-Type: ' . mime_content_type($path));
			header('Content-Length: ' . filesize($path));
			readfile($path);
		}
	}
	
	exit;
}

function deleteFile() {
	global $datadir;
	
	$delete_file = function($key) use(&$datadir) {
		return (get_association_value($key) !== false
				&& unlink($datadir . '/' . $key)
				&& remove_association($key));
	};
	
	$res = array('status' => 0);
	
	if(isset($_POST['target'])) {
		if(is_array($_POST['target'])) {
			foreach($_POST['target'] as $key) {
				if(!$delete_file($key)) {
					$res['status'] = 1;
				}
			}
		} else {
			if(!$delete_file($_POST['target'])) {
				$res['status'] = 1;
			}
		}
	} else {
		$res['status'] = 1;
	}
	
	return $res;
}

function renameFile() {
	global $datadir;
	
	$rename_file = function($key, $newname) use(&$datadir) {
		set_association($key, $newname);
	};
	
	$res = array('status' => 0);
	
	if(isset($_POST['target']) && isset($_POST['basename'])) {
		if(!is_array($_POST['basename']) && preg_match('/^[^\\/:*?"<>|]+$/', $_POST['basename']) == 1) {
			if(is_array($_POST['target'])) {
				foreach($_POST['target'] as $key) {
					if($rename_file($key, $_POST['basename'])) {
						$res['status'] = 1;
					}
				}
			} else {
				if($rename_file($_POST['target'], $_POST['basename'])) {
					$res['status'] = 1;
				}
			}
		} else {
			$res['status'] = 1;
		}
	} else {
		$res['status'] = 1;
	}
	
	return $res;
}

function fileinfo() {
	global $datadir;
	
	$get_fileinfo = function($key) use(&$datadir) {
		$value = get_association_value($key);
		
		if($value !== false) {
			$path = $datadir . '/' . $key;
			
			return array(
				'key'		=> $key,
				'basename'	=> $value,
				'exist'		=> file_exists($path),
				'atime'		=> fileatime($path),
				'mtime'		=> filemtime($path),
				'size'		=> filesize($path),
			);
		} else {
			return array(
				'key'		=> $key,
				'basename'	=> '',
				'exist'		=> false,
				'atime'		=> 0,
				'mtime'		=> 0,
				'size'		=> 0,
			);
		}
	};
	
	$res = array('status' => 0, 'info' => array());
	if(isset($_POST['target'])) {
		if(is_array($_POST['target'])) {
			foreach($_POST['target'] as $key) {
				$res['info'][$key] = $get_fileinfo($key);
			}
		} else {
			$res['info'][$_POST['target']] = $get_fileinfo($_POST['target']);
		}
	} else {
		$allkey = get_association_allkey();
		foreach($allkey as $key) {
			$res['info'][$key] = $get_fileinfo($key);
		}
	}
	
	uasort($res['info'], function($a, $b) {
		if(strcmp($a['basename'], $b['basename']) != 0) {
			return strcmp($a['basename'], $b['basename']);
		} else if($a['mtime'] != $b['mtime']) {
			return ($a['mtime'] - $b['mtime']);
		} else {
			return ($a['atime'] - $b['atime']);
		}
	});
	
	return $res;
}



function add_association($key, $value) {
	global $association;
	return (file_put_contents($association, $key . $value . PHP_EOL, FILE_APPEND | LOCK_EX) !== false);
}

function get_association_allkey() {
	global $association, $key_length;
	
	$line = file($association, FILE_IGNORE_NEW_LINES);
	for($i = 0; $i < count($line); $i++) {
		$line[$i] = substr($line[$i], 0, $key_length);
	}
	
	return $line;
}

function get_association_value($key) {
	global $association, $key_length;
	
	$line = file($association, FILE_IGNORE_NEW_LINES);
	for($i = 0; $i < count($line); $i++) {
		if(strcmp(substr($line[$i], 0, $key_length), $key) == 0) {
			return substr($line[$i], $key_length);
		}
	}
	
	return false;
}

function remove_association($key) {
	global $association, $key_length;
	
	$line = file($association, FILE_IGNORE_NEW_LINES);
	$str = '';
	for($i = 0; $i < count($line); $i++) {
		if(strcmp(substr($line[$i], 0, $key_length), $key) != 0) {
			$str .= $line[$i] . PHP_EOL;
		}
	}
	
	return (file_put_contents($association, $str, LOCK_EX) !== false);
}

function set_association($key, $value) {
	global $association, $key_length;
	
	$line = file($association, FILE_IGNORE_NEW_LINES);
	$str = '';
	$foundKey = false;
	for($i = 0; $i < count($line); $i++) {
		if(strcmp(substr($line[$i], 0, $key_length), $key) == 0) {
			$str .= $key . $value . PHP_EOL;
			$foundKey = true;
		} else {
			$str .= $line[$i] . PHP_EOL;
		}
	}
	
	if($foundKey) {
		return (file_put_contents($association, $str, LOCK_EX) !== false);
	} else {
		return add_association($key, $value);
	}
}


function generate_key() {
	global $key_length;
	return random_string($key_length);
}



function random_string($length) {
	$character = array_merge(range('A', 'Z'), range('a', 'z'), range('0', '9'));
	$str = '';
	for($i = 0; $i < $length; $i++) {
		$str .= $character[rand(0, count($character) - 1)];
	}
	return $str;
}

function to_json($json) {
	$res = '{';
	
	foreach($json as $key => $value) {
		$res .= '"' . $key . '":';
		
		if(is_array($value)) {
			if(count($value) == 0) {
				$res .= '{}';
			} else {
				$res .= to_json($value);
			}
		} else if(is_int($value) || is_float($value)) {
			$res .= $value;
		} else if(is_bool($value)) {
			$res .= ($value ? 'true' : 'false');
		} else {
			$res .= '"' . $value . '"';
		}
		
		$res .= ',';
	}
	$res = substr($res, 0, strlen($res) - 1) . '}';
	return $res;
}

?>

