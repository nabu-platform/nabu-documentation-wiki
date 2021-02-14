if (!nabu) { var nabu = {} }
if (!nabu.tmp) { nabu.tmp = {} }

// contain timeouts that are linked
nabu.tmp.timeouts = {};

Vue.directive("timeout", {
	bind: function(element, binding) {
		var keys = null;
		if (binding.modifiers) {
			keys = Object.keys(binding.modifiers);
		}
		var timeout = 600;
		var handle = null;
		if (keys) {
			for (var i = 0; i < keys.length; i++) {
				if (keys[i].match("[0-9]+")) {
					timeout = new Number(keys[i]);
				}
				else {
					handle = keys[i];
				}
			}
		}
		
		var target = element.__vue__ ? element.__vue__ : element;

		target["$n-timeout-handle"] = null;
		target["$n-timeout-handler"] = function() {
			if (handle != null) {
				if (nabu.tmp.timeouts[handle] != null) {
					clearTimeout(nabu.tmp.timeouts[handle]);
				}
			}
			else if (element["$n-timeout-handle"] != null) {
				clearTimeout(element["$n-timeout-handle"]);
			}
			var timer = setTimeout(function() {
				binding.value();
			}, timeout);
			
			if (handle != null) {
				nabu.tmp.timeouts[handle] = timer;
			}
			else {
				element["$n-timeout-handle"] = timer;
			}
		};
		
		if (element.__vue__) {
			target.$on(binding.arg, target["$n-timeout-handler"]);
		}
		else {
			element.addEventListener(binding.arg, target["$n-timeout-handler"]);
		}
	},
	unbind: function(element, binding) {
		var target = element.__vue__ ? element.__vue__ : element;
		if (target["$n-timeout-handler"]) {
			if (element.__vue__) {
				target.$off(binding.arg, target["$n-timeout-handler"]);
			}
			else {
				element.removeEventListener(binding.arg, target["$n-timeout-handler"]);
			}
		}
	}
});