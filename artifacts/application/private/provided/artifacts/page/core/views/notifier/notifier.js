Vue.service("basicNotifier", {
	created: function() {
		nabu.page.provide("page-notifier", this);
	},
	data: function() {
		return {
			// for the notification ranking
			priority: -1,
			// the root element where we append to
			root: null,
			// the basic component we use, it could theoretically be swapped out for another
			component: "basic-notification",
			defaultDuration: 5000
		}	
	},
	methods: {
		push: function(notification) {
			var component = Vue.component(this.component);
			var result = new component({propsData: notification});
			var target = this.getRoot();
			this.$render({
				target: target,
				content: result,
				append: true
			});
			if (notification.duration == null) { 
				notification.duration = this.defaultDuration;
			}
			if (notification.duration > 0) {
				setTimeout(function() {
					result.close();
				}, notification.duration);
			}
		},
		getRoot: function() {
			if (this.root == null) {
				this.root = document.createElement("div");
				this.root.setAttribute("class", "global-notifications");
				document.body.appendChild(this.root);
			}
			return this.root;
		}
	}	
});

Vue.component("basic-notification", {
	props: {
		name: {
			type: String
		},
		event: {
			type: String
		},
		title: {
			type: String
		},
		message: {
			type: String
		},
		icon: {
			type: String
		},
		severity: {
			type: String
		},
		closeable: {
			type: Boolean
		},
		actions: {
			type: Array
		},
		data: {
			type: Object
		}
	},
	template: "<div class='basic-notification' :class='severity ? severity : \"info\"'><span class='notification-icon' v-if='icon' v-content=\"$services.page.getIconHtml(icon)\"/>"
		+ "<div class='notification-content'><h3 class='title' v-if='title' v-content.sanitize.compile='title'/>"
		+ "<p class='message' v-if='message' v-content.sanitize.compile='message'/>"
		+ "<span class='close-icon' @click='close' v-if='closeable' v-content=\"$services.page.getIconHtml('times')\" /></div></div>",
	methods: {
		close: function() {
			this.$el.parentNode.removeChild(this.$el);
		}
	}
});