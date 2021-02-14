Vue.directive("action", {
	bind: function(element, binding, vnode) {
		var native = ["click", "hover", "mouseover", "mouseout"];
		
		var handler = function(event) {
			element.setAttribute("disabled", "disabled");
			var result = binding.value(event);
			if (result && result.then) {
				var span = document.createElement("span");
				span.setAttribute("class", "n-icon n-icon-spinner");
				span.setAttribute("style", "display: inline-block; text-align: center");
				element.appendChild(span);
				var handler = function() {
					element.removeAttribute("disabled");
					element.removeChild(span);
				};
				result.then(handler, handler);
			}
			else {
				element.removeAttribute("disabled");
			}
		};
		
		if (!binding.arg || native.indexOf(binding.arg) >= 0) {
			element.addEventListener(binding.arg ? binding.arg : "click", handler);
		}
		else {
			vnode.context.$on(binding.arg, handler);
		}
	}
});