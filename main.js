function main() {
	var cloud = new Cloud();
	var ui = new Ui();
	var progress = {};
	
	
	ui.addEventListener('upload', function(target) {
		var id = cloud.uploadFile(target);
		progress[id] = ui.addProgress(lang.uploading);
	});
	ui.addEventListener('download', function(target) {
		var key = Object.keys(target);
		// var id = cloud.downloadFile(key);
		// progress[id] = ui.addProgress(lang.downloading);
		
		var id;
		if(key.length == 1) {
			id = cloud.downloadFile(key[0]);
		} else {
			ui.createMessageDialog(lang.underConstruction.multiDownload);
			return;
		}
		progress[id] = ui.addProgress(lang.downloading);
	});
	ui.addEventListener('view', function(target) {
		var key = Object.keys(target);
		var id = cloud.viewFile(key[0]);
		progress[id] = ui.addProgress(lang.opening);
	});
	ui.addEventListener('delete', function(target) {
		var key = Object.keys(target);
		var content = document.createElement('span');
		content.innerHTML = lang.deleteMsgFirst
				+ (key.length == 1 ? target[key[0]].basename : (key.length + lang.item))
				+ lang.deleteMsgLast;
		
		var action = {};
		action[lang.no] = undefined;
		action[lang.yes] = function() {
			var id = cloud.deleteFile(key);
			progress[id] = ui.addProgress(lang.deleting);
			return true;
		};
		
		ui.createDialog(content, action);
	});
	ui.addEventListener('rename', function(target) {
		var key = Object.keys(target);
		
		var content = document.createElement('input');
		content.setAttribute('type', 'text');
		content.setAttribute('value', target[key[0]]['basename']);
		content.setAttribute('placeholder', lang.renamePlaceholder);		
		
		var action = {};
		action[lang.no] = undefined;
		action[lang.yes] = function() {
			var newname = content.value;
			var pattern = /^[^\\/:*?"<>|]+$/;
			
			if(pattern.test(newname)) {
				var id = cloud.renameFile(key, content.value);
				progress[id] = ui.addProgress(lang.renaming);
				return true;
			} else {
				ui.createMessageDialog(lang.renameToIlligalName);
			}
		};
		
		ui.createDialog(content, action);
	});
	
	
	cloud.addEventListener('upload', function(type, id, result) {
		ui.deleteProgress(progress[id]);
		delete progress[id];
		
		if(type == 'load' && result) {
			var id = cloud.readFile();
			progress[id] = ui.addProgress(lang.loading);
		} else {
			ui.createMessageDialog(lang.uploadFailure);
		}
	});
	cloud.addEventListener('download', function(type, id, result) {
		ui.deleteProgress(progress[id]);
		delete progress[id];
		
		if(!(type == 'load' && result)) {
			ui.createMessageDialog(lang.downloadFailure);
		}
	});
	cloud.addEventListener('view', function(type, id, result) {
		ui.deleteProgress(progress[id]);
		delete progress[id];
		
		if(type == 'load' && result) {
			ui.createViewer(result);
		}
	});
	cloud.addEventListener('delete', function(type, id, result) {
		ui.deleteProgress(progress[id]);
		delete progress[id];
		
		if(type == 'load' && result) {
			var id = cloud.readFile();
			progress[id] = ui.addProgress(lang.loading);
		} else {
			ui.createMessageDialog(lang.deleteFailure);
		}
	});
	cloud.addEventListener('rename', function(type, id, result) {
		ui.deleteProgress(progress[id]);
		delete progress[id];
		
		if(type == 'load' && result) {
			var id = cloud.readFile();
			progress[id] = ui.addProgress(lang.loading);
		} else {
			ui.createMessageDialog(lang.renameFailure);
		}
	});
	cloud.addEventListener('read', function(type, id, result) {
		ui.deleteProgress(progress[id]);
		delete progress[id];
		
		if(type == 'load') {
			if(result === undefined) {
				result = {};
			}
			ui.updateFileElement(result);
		}
	});
	
	var updateFileList = function() {
		var id = cloud.readFile();
		progress[id] = ui.addProgress(lang.loading);
		
		window.setTimeout(updateFileList, 60 * 1000);
	};
	updateFileList();
}





window.addEventListener('load', function() {
	document.title = lang.serviceName;
	document.getElementsByTagName('header')[0]
		.getElementsByTagName('h1')[0].innerText = lang.serviceName;
	
	main();
});

