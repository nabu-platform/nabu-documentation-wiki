Vue.directive("bubble", {
	bind: function(element, binding, vnode) {
		var event = binding.arg ? binding.arg : "input";
		vnode.componentInstance.$on(event, function() {
			var parameters = [];
			for (var i = 0; i < arguments.length; i++) {
				parameters.push(arguments[i]);
			}
			if (!binding.value || !!binding.value.apply(vnode.context, parameters)) {
				// add the event before calling the emit
				parameters.unshift(event);
				vnode.context.$emit.apply(vnode.context, parameters);
			}
		});
	}
});