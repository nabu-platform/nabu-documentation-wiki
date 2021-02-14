if (!nabu) { var nabu = {} }
if (!nabu.tmp) { nabu.tmp = {} }

nabu.tmp.panes = Vue.extend({
	data: function() {
		return {
			panes: []
		}
	}
});

nabu.tmp.panes = new nabu.tmp.panes();

Vue.directive("pane", {
	bind: function(element, binding) {
		element.classList.add("v-pane-" + nabu.tmp.panes.panes.length);
		if (binding.value) {
			element.paneValue = binding.value;
		}
		if (!element.hasAttribute("id")) {
			element.setAttribute("id", "v-pane-" + nabu.tmp.panes.panes.length);
		}
		nabu.tmp.panes.panes.push(element);
	},
	unbind: function(element, binding) {
		var index = nabu.tmp.panes.panes.indexOf(element);
		if (index >= 0) {
			// we decrease the counters of all the panes after this one
			for (var i = index + 1; i < nabu.tmp.panes.panes.length; i++) {
				if (element.hasAttribute("id") && element.getAttribute("id").match("v-pane-[0-9]+")) {
					element.setAttribute("id", "v-pane-" + i);
				}
				element.classList.remove("v-pane-" + i);
				element.classList.add("v-pane-" + (i - 1));
			}
			// remove the element from the panes
			nabu.tmp.panes.panes.splice(index, 1);
		}
		element.paneValue = null;
	}
});

Vue.component("n-pane-crumbs", {
	template: "<div class='n-pane-crumbs'><div @mouseover='highlight(pane)' @mouseout='unhighlight()' @click='select(pane)' v-for='pane in $window.nabu.tmp.panes.panes'><span v-if='pane.name'>{{pane.name}}</span></div></div>",
	methods: {
		highlight: function(pane) {
			this.unhighlight();
			pane.$el.classList.add("v-pane-hover");
		},
		unhighlight: function() {
			for (var i = 0; i < nabu.tmp.panes.panes.length; i++) {
				nabu.tmp.panes.panes[i].$el.classList.remove("v-pane-hover");
			}
		}
	}
});

Vue.component("n-panes", {
	template: "<div class='n-panes'><slot></slot></div>"
});

Vue.component("n-pane", {
	props: {
		name: {
			type: String,
			required: false
		}
	},
	template: "<div class='n-pane'><n-pane-crumbs/><slot></slot></div>",
	data: function() {
		return {
			index: 0
		}
	},
	mounted: function() {
		this.register();
	},
	updated: function() {
		this.register();
	},
	methods: {
		register: function() {
			if (nabu.tmp.panes.panes.indexOf(this) < 0) {
				this.$el.classList.add("v-pane-" + nabu.tmp.panes.panes.length);
				if (!this.$el.hasAttribute("id")) {
					this.$el.setAttribute("id", "v-pane-" + nabu.tmp.panes.panes.length);
				}
				nabu.tmp.panes.panes.push(this);
				this.setReverse();
			}
		},
		setReverse: function() {
			for (var i = 0; i < nabu.tmp.panes.panes.length; i++) {
				var element = nabu.tmp.panes.panes[i].$el;
				if (element.hasAttribute("v-pane-reverse-index")) {
					element.classList.remove("v-pane-reverse-" + element.getAttribute("v-pane-reverse-index"));
				}
				element.setAttribute("v-pane-reverse-index", nabu.tmp.panes.panes.length - 1 - i);
				element.classList.add("v-pane-reverse-" + element.getAttribute("v-pane-reverse-index"));
			}
		}
	},
	beforeDestroy: function() {
		var index = nabu.tmp.panes.panes.indexOf(this);
		if (index >= 0) {
			// we decrease the counters of all the panes after this one
			for (var i = index + 1; i < nabu.tmp.panes.panes.length; i++) {
				var element = nabu.tmp.panes.panes[i].$el;
				if (element.hasAttribute("id") && element.getAttribute("id").match("v-pane-[0-9]+")) {
					element.setAttribute("id", "v-pane-" + i);
				}
				element.classList.remove("v-pane-" + i);
				element.classList.add("v-pane-" + (i - 1));
			}
			this.setReverse();
			// remove the element from the panes
			nabu.tmp.panes.panes.splice(index, 1);
		}
	}
});