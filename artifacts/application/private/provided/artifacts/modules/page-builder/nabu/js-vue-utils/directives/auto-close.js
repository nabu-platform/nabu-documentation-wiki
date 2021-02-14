// this directive adds functionality to a component so it autocloses if you click anywhere else
// additionally you can add specific "auto-close" attributes to certain elements inside that should also close the element
Vue.directive("auto-close", {
	bind: function(element, binding) {
		var keys = binding.modifiers ? Object.keys(binding.modifiers) : null;
		element["$n-auto-close-listener"] = function(event) {
			// it still has to be in the document to be valid
			var close = event.target != element && !element.contains(event.target) && document.body.contains(event.target);
			var inside = false;
			if (!close && element.contains(event.target)) {
				var find = event.target;
				var attribute = "auto-close";
				// we can look for specific auto-closes
				if (keys.length) {
					attribute += "-" + keys[0];
				}
				while (find != element) {
					if (find.hasAttribute(attribute) && find.getAttribute(attribute) != "false") {
						close = true;
						inside = true;
						break;
					}
					find = find.parentNode;
				}
			}
			if (close && binding.value) {
				binding.value(inside);
			}
		};
		window.addEventListener("click", element["$n-auto-close-listener"], true);
	},
	unbind: function(element) {
		if (element["$n-auto-close-listener"]) {
			window.removeEventListener("click", element["$n-auto-close-listener"], true);
		}
	}
});

