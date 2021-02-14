Vue.directive("focus", {
	inserted: function(element, binding, vnode) {
		if (typeof(binding.value) == "undefined" || !!binding.value) {
			Vue.nextTick(function() {
				var children = element.getElementsByTagName("input");
				if (children.length) {
					children[0].focus();
				}
				else {
					element.focus();
				}
			});
		}
	}
});