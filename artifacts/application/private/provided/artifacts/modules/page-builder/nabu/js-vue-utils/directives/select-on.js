Vue.directive("select-on", {
	bind: function(element, binding) {
		
		var target = element.__vue__ ? element.__vue__ : element;
		
		target["$n-select-on-handler"] = function ($event) {
			if ( !$event || !$event.target ) {
				console.warn("A valid DOM event should be provided as the first argument");
				return;
			}
			try {
				setTimeout(function () {
					$event.target.select();
				}, 1);
			}
			catch (error) {
				console.log("error selecting element content", error, $event.target);
			}
		};
		
		if (element.__vue__) {
			target.$on(binding.arg, target["$n-select-on-handler"]);
		}
		else {
			element.addEventListener(binding.arg, target["$n-select-on-handler"]);
		}
	},
	unbind: function(element, binding) {
		var target = element.__vue__ ? element.__vue__ : element;
		if (target["$n-select-on-handler"]) {
			if (element.__vue__) {
				target.$off(binding.arg, target["$n-select-on-handler"]);
			}
			else {
				element.removeEventListener(binding.arg, target["$n-select-on-handler"]);
			}
		}
	}
});