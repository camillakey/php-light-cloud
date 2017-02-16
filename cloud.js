function Cloud() {
	this.eventListener = {
		'upload'	: [],
		'download'	: [],
		'view'		: [],
		'delete'	: [],
		'rename'	: [],
		'read'		: [],
	};
	this.request = {};
}


Cloud.prototype.addEventListener = function(event, listener) {
	this.eventListener[event].push(listener);
};

Cloud.prototype.callEventListener = function(event) {
	if(this.eventListener[event] !== undefined) {
		var args = Array.prototype.slice.call(arguments, 1);
		for(var listener of this.eventListener[event]) {
			listener.apply(this, args);
		}
	}
};


Cloud.prototype.uploadFile = function(target) {
	var data = {'manip' : 'upload'};
	if(target.constructor.name === 'FileList') {
		data['target[]'] = [];
		for(var i = 0; i < target.length; i++) {
			data['target[]'][i] = target[i];
		}
	} else {
		data['target'] = target;
	}
	
	return this.manipulation(data, 'json', (function(type, id, response) {
		switch(type) {
			case 'error':
			case 'abort':
			case 'timeout':
				this.callEventListener('upload', type, id);
				break;
			case 'load':
				var json = response;
				var result = (json.status == 0);
				
				this.callEventListener('upload', type, id, result);
				break;
		}
	}).bind(this));
};

Cloud.prototype.downloadFile = function(target) {
	var data = {'manip': 'fileinfo'};
	if(Array.isArray(target)) {
		data['target[]'] = [];
		for(var t of target) {
			data['target[]'].push(t);
		}
	} else {
		data['target'] = target;
	}
	
	return this.manipulation(data, 'json', (function(type, id, response) {
		switch(type) {
			case 'error':
			case 'abort':
			case 'timeout':
				this.callEventListener('download', type, id);
				break;
			case 'load':
				var json = response;
				
				var data = {'manip': 'download'};
				if(Array.isArray(target)) {
					for(var t of target) {
						if(!json['info'][t].exist) {
							this.callEventListener('download', type, id, false);
							return;
						}
						data['target[]'].push(t);
					}
				} else {
					if(!json['info'][target].exist) {
						this.callEventListener('download', type, id, false);
						return;
					}
					data['target'] = target;
				}
				
				this.callEventListener('download', type, id, true);
				this.postManipulation(data);
				break;
		}
	}).bind(this));
};

Cloud.prototype.viewFile = function(target) {
	var data = {'manip' : 'view'};
	if(Array.isArray(target)) {
		return;
	} else {
		data['target'] = target;
	}
	
	return this.manipulation(data, 'blob', (function(type, id, response) {
		switch(type) {
			case 'error':
			case 'abort':
			case 'timeout':
				this.callEventListener('view', type, id);
				break;
			case 'load':
				this.callEventListener('view', type, id, response);
				break;
		}
	}).bind(this));
};

Cloud.prototype.deleteFile = function(target) {
	var data = {'manip': 'delete'};
	if(Array.isArray(target)) {
		data['target[]'] = [];
		for(var t of target) {
			data['target[]'].push(t);
		}
	} else {
		data['target'] = target;
	}
	
	return this.manipulation(data, 'json', (function(type, id, response) {
		switch(type) {
			case 'error':
			case 'abort':
			case 'timeout':
				this.callEventListener('delete', type, id);
				break;
			case 'load':
				var json = response;
				var result = (json.status == 0);
				
				this.callEventListener('delete', type, id, result);
				break;
		}
	}).bind(this));
};

Cloud.prototype.renameFile = function(target, basename) {
	var data = {'manip': 'rename', 'basename': basename};
	if(Array.isArray(target)) {
		data['target[]'] = [];
		for(var t of target) {
			data['target[]'].push(t);
		}
	} else {
		data['target'] = target;
	}
	
	return this.manipulation(data, 'json', (function(type, id, response) {
		switch(type) {
			case 'error':
			case 'abort':
			case 'timeout':
				this.callEventListener('rename', type, id);
				break;
			case 'load':
				var json = response;
				var result = (json.status == 0);
				
				this.callEventListener('rename', type, id, result);
				break;
		}
	}).bind(this));
}

Cloud.prototype.readFile = function(target) {
	var data = {'manip' : 'fileinfo'};
	if(target !== undefined) {
		if(Array.isArray(target)) {
			data['target[]'] = [];
			for(var t of target) {
				data['target[]'].push(t);
			}
		} else {
			data['target'] = target;
		}
	}
	
	return this.manipulation(data, 'json', (function(type, id, response) {
		switch(type) {
			case 'error':
			case 'abort':
			case 'timeout':
				this.callEventListener('read', type, id);
				break;
			case 'load':
				var json = response;
				var info = json['info'];
				
				this.callEventListener('read', type, id, info);
				break;
		}
	}).bind(this));
};


Cloud.prototype.manipulation = function(data, responseType, listener) {
	var generateId = function() {
		return Math.floor(Math.random() * 900000 + 100000);
	}
	
	var id = generateId();
	
	var xhr = new XMLHttpRequest();
	xhr.addEventListener('error', function() {
		listener('error', id);
	});
	xhr.addEventListener('abort', function() {
		listener('abort', id);
	});
	xhr.addEventListener('timeout', function() {
		listener('timeout', id);
	});
	xhr.addEventListener('load', function() {
		listener('load', id, xhr.response);
	});
	xhr.open('POST', 'manipulation.php');
	xhr.responseType = responseType;
	xhr.timeout = 60 * 1000;
	xhr.send(this.toFormData(data));
	
	this.request[id] = xhr;
	
	return id;
};

Cloud.prototype.abortManipulation = function(id) {
	if(this.request[id] !== undefined) {
		this.request[id].abort();
		delete this.request[id];
	}
}

Cloud.prototype.postManipulation = function(data) {
	var form = document.createElement('form');
	form.setAttribute('method', 'POST');
	form.setAttribute('action', 'manipulation.php');
	
	for(var key in data) {
		var input = document.createElement('input');
		input.setAttribute('type', 'hidden');
		input.setAttribute('name', key);
		input.setAttribute('value', data[key]);
		form.appendChild(input);
	}
	
	document.body.appendChild(form);
	form.submit();
	document.body.removeChild(form);
};

Cloud.prototype.toFormData = function(data) {
	var append = function(fd, name, value) {
		if(value.constructor.name === 'File') {
			fd.append(name, value, value.name);
		} else {
			fd.append(name, value);
		}
	}
	
	var formData = new FormData();
	
	for(var key in data) {
		if(Array.isArray(data[key])) {
			for(var i = 0; i < data[key].length; i++) {
				append(formData, key, data[key][i]);
			}
		} else {
			append(formData, key, data[key]);
		}
	}
	
	return formData;
};

