if (!nabu) { var nabu = {} }
if (!nabu.tmp) { nabu.tmp = {} }

nabu.tmp.groups = {};

Vue.directive("group", {
	bind: function(element, binding) {
		var component = element.__vue__;
		if (component) {
			var group = binding.arg ? binding.arg : binding.value;
			if (typeof(nabu.tmp.groups[group]) == "undefined") {
				nabu.tmp.groups[group] = [];
			}
			if (nabu.tmp.groups[group].indexOf(component) < 0) {
				nabu.tmp.groups[group].push(component);
				component.$group = nabu.tmp.groups[group];
			
				for (var i = 0; i < nabu.tmp.groups[group].length; i++) {
					nabu.tmp.groups[group][i].$emit("$vue.group.added", component);
				}
			}
		}
	},
	update: function(element, binding) {
		var component = element.__vue__;
		if (component) {
			var found = false;
			var group = binding.arg ? binding.arg : binding.value;
			for (var key in nabu.tmp.groups) {
				var index = nabu.tmp.groups[key].indexOf(component);
				if (index >= 0) {
					if (group == key) {
						found = true;
					}
					else {
						nabu.tmp.groups[key].splice(index, 1);
						for (var i = 0; i < nabu.tmp.groups[key].length; i++) {
							nabu.tmp.groups[key][i].$emit("$vue.group.removed", component);
						}
					}
				}
			}
			if (!found) {
				if (typeof(nabu.tmp.groups[group]) == "undefined") {
					nabu.tmp.groups[group] = [];
				}
				nabu.tmp.groups[group].push(component);
				component.$group = nabu.tmp.groups[group];
			
				for (var i = 0; i < nabu.tmp.groups[group].length; i++) {
					nabu.tmp.groups[group][i].$emit("$vue.group.added", component);
				}
			}
		}
	},
	unbind: function(element, binding) {
		var component = element.__vue__;
		if (component) {
			for (var key in nabu.tmp.groups) {
				var index = nabu.tmp.groups[key].indexOf(component);
				if (index >= 0) {
					nabu.tmp.groups[key].splice(index, 1);
					for (var i = 0; i < nabu.tmp.groups[key].length; i++) {
						nabu.tmp.groups[key][i].$emit("$vue.group.removed", component);
					}
				}
			}
		}
	}
});

Vue.mixin({
	beforeDestroy: function() {
		if (Object.keys(nabu.tmp.groups).length) {
			var removeFromGroups = function(component) {
				for (var key in nabu.tmp.groups) {
					var index = nabu.tmp.groups[key].indexOf(component);
					if (index >= 0) {
						nabu.tmp.groups[key].splice(index, 1);
						for (var i = 0; i < nabu.tmp.groups[key].length; i++) {
							nabu.tmp.groups[key][i].$emit("$vue.group.removed", component);
						}
					}
				}
			}
		
			var recurse = function(component) {
				removeFromGroups(component);
				for (var i = 0; i < component.$children.length; i++) {
					recurse(component.$children[i]);
				}
			}
		
			recurse(this);
		}
	}
});