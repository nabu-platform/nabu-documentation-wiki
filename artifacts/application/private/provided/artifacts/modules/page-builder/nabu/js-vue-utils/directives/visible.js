if (!nabu) { var nabu = {} }
if (!nabu.tmp) { nabu.tmp = {} }

nabu.tmp.visibleElementListeners = [];
nabu.tmp.visibleElementTimeout = null;

window.addEventListener("scroll", function(event) {
	if (nabu.tmp.visibleElementTimeout) {
		clearTimeout(nabu.tmp.visibleElementTimeout);
		nabu.tmp.visibleElementTimeout = null;
	}
	nabu.tmp.visibleElementTimeout = setTimeout(function() {
		nabu.tmp.visibleElementListeners.map(function(listener) {
			var visible = nabu.utils.elements.inViewport(listener.element);
			// visibility has changed
			if (visible != listener.visible) {
				listener.visible = visible;
				if (listener.target) {
					listener.target.$visible = visible;
				}
				if (listener.handler) {
					listener.handler(visible);
				}
			}
		});
	}, 100);
});

Vue.directive("visible", {
	bind: function(element, binding) {
		var target = element.__vue__;
		var result = {
			element: element,
			target: target,
			handler: binding.value,
			visible: false
		};
		nabu.tmp.visibleElementListeners.push(result);
		if (target) {
			Vue.set(target, "$visible", false);
		}
		// we only know after rendering which are visible and which aren't
		Vue.nextTick(function() {
			result.visible = nabu.utils.elements.inViewport(element);
			if (result.visible) {
				if (result.target) {
					result.target.$visible = result.visible;
				}
				if (result.handler) {
					result.handler(result.visible);
				}
			}
		});
	},
	unbind: function(element, binding) {
		var current = nabu.tmp.visibleElementListeners.filter(function(x) { return x.element == element })[0];
		if (current) {
			nabu.tmp.visibleElementListeners.splice(nabu.tmp.visibleElementListeners.indexOf(current), 1);
		}
	}
});

