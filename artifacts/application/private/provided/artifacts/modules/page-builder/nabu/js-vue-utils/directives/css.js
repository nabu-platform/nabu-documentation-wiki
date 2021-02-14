// adds or removes css class based on event (default click)
Vue.directive("css", {
	bind: function(element, binding) {
		if (binding.value) {
			element = binding.value;
			if (element.$el) {
				element = element.$el;
			}
		}
		var target = element.__vue__ ? element.__vue__ : element;
		
		var clazz = Object.keys(binding.modifiers)[0];
		
		target["$n-css-handler"] = function() {
			if (element.classList.contains(clazz)) {
				element.classList.remove(clazz);
			}
			else {
				element.classList.add(clazz);
			}
		}
		
		if (element.__vue__) {
			target.$on(binding.arg ? binding.arg : "click", target["$n-css-handler"]);
		}
		else {
			target.addEventListener(binding.arg ? binding.arg : "click", target["$n-css-handler"]);
		}
	},
	unbind: function(element, binding) {
		if (binding.value) {
			element = binding.value;
		}
		var target = element.__vue__ ? element.__vue__ : element;
		if (target["$n-css-handler"]) {
			if (element.__vue__) {
				target.$off(binding.arg, target["$n-css-handler"]);
			}
			else {
				target.removeEventListener(binding.arg, target["$n-css-handler"]);
			}
		}
	}
});