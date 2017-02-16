function Ui() {
	this.eventListener = {
		'upload'	: [],
		'download'	: [],
		'view'		: [],
		'delete'	: [],
		'rename'	: [],
	};
	this.allDiv = {};
	this.focusedDivKey;
	
	(function() {
		var manager = document.getElementById('manager');
		manager.addEventListener('click', (function() {
			for(var key in this.allDiv) {
				delete this.allDiv[key].dataset.selected;
			}
		}).bind(this));
		manager.oncontextmenu = (function(e) {
			this.createMessageDialog(lang.underConstruction.contextMenu);
			return false;
		}).bind(this);
	}).call(this);
	
	(function() {
		var dropbox = document.getElementById('manager');
		dropbox.addEventListener("dragenter", function(e) {
			e.stopPropagation();
			e.preventDefault();
		});
		dropbox.addEventListener("dragover", function(e) {
			e.stopPropagation();
			e.preventDefault();
		});
		dropbox.addEventListener("drop", (function(e) {
			e.stopPropagation();
			e.preventDefault();
		
			var dt = e.dataTransfer;
			var files = dt.files;
		
			this.callEventListener('upload', files);
		}).bind(this));
	}).call(this);
}


Ui.prototype.addEventListener = function(event, listener) {
	this.eventListener[event].push(listener);
};

Ui.prototype.callEventListener = function(event) {
	if(this.eventListener[event] !== undefined) {
		var args = Array.prototype.slice.call(arguments, 1);
		for(var listener of this.eventListener[event]) {
			listener.apply(this, args);
		}
	}
};


Ui.prototype.updateFileElement = function(file) {
	var fileElement = (function(info) {
		var fileDiv = document.createElement('div');
		fileDiv.setAttribute('class', 'file');
		fileDiv.addEventListener('click', (function(e) {
			e.stopPropagation();
			e.preventDefault();
			
			var selectedKey = [];
			for(var key in this.allDiv) {
				if(this.allDiv[key].dataset.selected !== undefined) {
					selectedKey.push(key);
				}
			}
			
			if(this.focusedDivKey == fileDiv.dataset.key
					&& Date.now() - fileDiv.dataset.lastClick <= 300) {
				var sendData = {};
				sendData[fileDiv.dataset.key] = {
					key			: fileDiv.dataset.key,
					basename	: fileDiv.dataset.basename,
					atime		: fileDiv.dataset.atime,
					mtime		: fileDiv.dataset.mtime,
					size		: fileDiv.dataset.size,
				};
				
				this.callEventListener('view', sendData);
			} else if(this.focusedDivKey !== undefined && Key.isPressShift()) {
				var fromX = this.allDiv[this.focusedDivKey].getBoundingClientRect().left + window.pageXOffset;
				var fromY = this.allDiv[this.focusedDivKey].getBoundingClientRect().top + window.pageYOffset;
				var toX = fileDiv.getBoundingClientRect().left + window.pageXOffset;
				var toY = fileDiv.getBoundingClientRect().top + window.pageYOffset;
				
				if(fromX > toX) { let w = fromX; fromX = toX; toX = w; }
				if(fromY > toY) { let w = fromY; fromY = toY; toY = w; }
				
				for(var key in this.allDiv) {
					let x = this.allDiv[key].getBoundingClientRect().left + window.pageXOffset;
					let y = this.allDiv[key].getBoundingClientRect().top + window.pageYOffset;
					
					if((fromX <= x && x <= toX) && (fromY <= y && y <= toY)) {
						this.allDiv[key].dataset.selected = '';
					} else if(!Key.isPressCtrl()) {
						delete this.allDiv[key].dataset.selected;
					}
				}
			} else if(selectedKey.length == 0 || Key.isPressCtrl()) {
				if(fileDiv.dataset.selected !== undefined) {
					delete fileDiv.dataset.selected;
				} else {
					fileDiv.dataset.selected = '';
				}
			} else {
				for(var key in this.allDiv) {
					delete this.allDiv[key].dataset.selected;
				}
				fileDiv.dataset.selected = '';
			}
			
			if(this.focusedDivKey !== undefined) {
				delete this.allDiv[this.focusedDivKey].dataset.focused;
				delete this.allDiv[this.focusedDivKey].dataset.lastClick;
			}
			
			this.focusedDivKey = fileDiv.dataset.key;
			this.allDiv[this.focusedDivKey].dataset.focused = '';
			this.allDiv[this.focusedDivKey].dataset.lastClick = Date.now();
		}).bind(this));
		fileDiv.oncontextmenu = function(e) {
			e.stopPropagation();
			e.preventDefault();
			
			var sendData = {};
			for(var key in this.allDiv) {
				if(this.allDiv[key].dataset.selected !== undefined) {
					sendData[key] = {
						key			: this.allDiv[key].dataset.key,
						basename	: this.allDiv[key].dataset.basename,
						atime		: this.allDiv[key].dataset.atime,
						mtime		: this.allDiv[key].dataset.mtime,
						size		: this.allDiv[key].dataset.size,
					};
				}
			}
			
			if(Object.keys(sendData).length == 0) {
				sendData[fileDiv.dataset.key] = {
					key			: fileDiv.dataset.key,
					basename	: fileDiv.dataset.basename,
					atime		: fileDiv.dataset.atime,
					mtime		: fileDiv.dataset.mtime,
					size		: fileDiv.dataset.size,
				};
			}
			
			
			var action = {};
			action[lang.downloadFile] = (function() {
				this.callEventListener('download', sendData);
			}).bind(this);
			action[lang.deleteFile] = (function() {
				this.callEventListener('delete', sendData);
			}).bind(this);
			action[lang.renameFile] = (function() {
				this.callEventListener('rename', sendData);
			}).bind(this);
			
			var top = e.pageY + 'px';
			var left = e.pageX + 'px';
			
			this.createContextMenu(action, top, left);
			
			return false;
		}.bind(this);
		
		fileDiv.dataset.key = info['key'];
		fileDiv.dataset.basename = info['basename'];
		fileDiv.dataset.atime = info['atime'];
		fileDiv.dataset.mtime = info['mtime'];
		fileDiv.dataset.size = info['size'];
		
		
		var spanName = document.createElement('span');
		spanName.innerHTML = info['basename'];
		fileDiv.appendChild(spanName);
		
		var spanTime = document.createElement('span');
		spanTime.innerHTML = (new Date(info['mtime'] * 1000)).toLocaleString(undefined,
				{year: 'numeric', month: '2-digit', day: '2-digit',
				hour: '2-digit', minute: '2-digit', second: '2-digit'});
		fileDiv.appendChild(spanTime);
		
		this.allDiv[info['key']] = fileDiv;
		
		return fileDiv;
	}).bind(this);
	
	
	this.allDiv = {};
	this.selectedDivKey = {};
	this.focusedDivKey = undefined;
	
	var fileField = document.getElementById('file-field');
	while(fileField.firstChild) {
		fileField.removeChild(fileField.firstChild);
	}
	
	for(var key in file) {
		if(file[key]['exist']) {
			fileField.appendChild(fileElement(file[key]));
		}
	}
}


Ui.prototype.createViewer = function(blob, backgroundClickListener) {
	var manager = document.getElementById('manager');
	
	var viewerDiv = document.createElement('div');
	viewerDiv.setAttribute('class', 'viewer');
	var closeViewerDiv = function() {
		manager.removeChild(viewerDiv);
	}
	manager.appendChild(viewerDiv);
	
	var backgroundDiv = document.createElement('div');
	backgroundDiv.setAttribute('class', 'background');
	backgroundDiv.addEventListener('click', function() {
		if(backgroundClickListener === undefined
				|| backgroundClickListener()) {
			closeViewerDiv();	
		}
	});
	viewerDiv.appendChild(backgroundDiv);
	
	var reader = new FileReader();
	reader.onloadend = function() {
		var object = document.createElement('object');
		object.addEventListener('contextmenu', function(e) {
			e.stopPropagation();
		});
		object.setAttribute('data', reader.result);
		object.setAttribute('type', blob.type);
		viewerDiv.appendChild(object);
	};
	if(blob) {
		reader.readAsDataURL(blob);
	}
}


Ui.prototype.createDialog = function(content, action, backgroundClickListener) {
	var manager = document.getElementById('manager');
	
	var dialogDiv = document.createElement('div');
	dialogDiv.setAttribute('class', 'dialog');
	var closeDialogDiv = function() {
		manager.removeChild(dialogDiv);
	}
	manager.appendChild(dialogDiv);
	
	var backgroundDiv = document.createElement('div');
	backgroundDiv.setAttribute('class', 'background');
	backgroundDiv.addEventListener('click', function() {
		if(backgroundClickListener === undefined
				|| backgroundClickListener()) {
			closeDialogDiv();
		}
	});
	dialogDiv.appendChild(backgroundDiv);
	
	var contentDiv = document.createElement('div');
	contentDiv.setAttribute('class', 'content');
	contentDiv.appendChild(content);
	dialogDiv.appendChild(contentDiv);
	
	var actionDiv = document.createElement('div');
	actionDiv.setAttribute('class', 'action');
	contentDiv.appendChild(actionDiv);
	
	for(var label in action) {
		var input = document.createElement('input');
		input.setAttribute('type', 'button');
		input.setAttribute('value', label);
		input.addEventListener('click', function(listener) {
			if(listener === undefined || listener()) {
				closeDialogDiv();
			}
		}.bind(input, action[label]));
		actionDiv.appendChild(input);
	}
};

Ui.prototype.createMessageDialog = function(msg, closeText) {
	closeText = (closeText !== undefined ? closeText : lang.accept);
	
	var content = document.createElement('span');
	content.innerHTML = msg;
	
	var action = {};
	action[closeText] = undefined;
	this.createDialog(content, action);
};


Ui.prototype.createContextMenu = function(action, top, left) {
	var manager = document.getElementById('manager');
	
	var contextMenuDiv = document.createElement('div');
	contextMenuDiv.setAttribute('class', 'context-menu');
	var closeContextMenuDiv = function() {
		manager.removeChild(contextMenuDiv);
	};
	manager.appendChild(contextMenuDiv);
	
	var backgroundDiv = document.createElement('div');
	backgroundDiv.setAttribute('class', 'background');
	backgroundDiv.addEventListener('click', function() {
		closeContextMenuDiv();
	});
	contextMenuDiv.appendChild(backgroundDiv);
	
	var menuDiv = document.createElement('div');
	menuDiv.setAttribute('class', 'menu');
	menuDiv.setAttribute('style', 'top: ' + top + '; left: ' + left + ';');
	contextMenuDiv.appendChild(menuDiv);
	
	var ul = document.createElement('ul');
	menuDiv.appendChild(ul);
	
	for(var label in action) {
		var li = document.createElement('li');
		li.addEventListener('click', function(listener) {
			closeContextMenuDiv();
			if(listener !== undefined) {
				listener();
			}
		}.bind(li, action[label]));
		ul.appendChild(li);
		
		var span = document.createElement('span');
		span.innerHTML = label;
		li.appendChild(span);
	}
};


Ui.prototype.addProgress = function(msg) {
	var progressDiv = document.getElementById('progress');
	var ul = progressDiv.getElementsByTagName('ul')[0];
	
	var span = document.createElement('span');
	span.innerHTML = msg;
	
	var li = document.createElement('li');
	
	li.appendChild(span);
	ul.appendChild(li);
	
	return li;
}

Ui.prototype.deleteProgress = function(li) {
	var progressDiv = document.getElementById('progress');
	var ul = progressDiv.getElementsByTagName('ul')[0];
	ul.removeChild(li);
}



var Key = new function() {
	this.pressKey = {
		'ctrl'	: false,
		'shift'	: false,
	};
	
	
	(function() {
		var keyEventListener = (function(e) {
			this.pressKey['ctrl'] = e.ctrlKey;
			this.pressKey['shift'] = e.shiftKey;
		}).bind(this);
		
		window.addEventListener('keydown', keyEventListener);
		window.addEventListener('keyup', keyEventListener);
	}).call(this);
	
	
	this.isPressCtrl = function() {
		return this.pressKey['ctrl'];
	};

	this.isPressShift = function() {
		return this.pressKey['shift'];
	};
};

