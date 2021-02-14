Vue.component("page-renderer-slider", {
	template: "#page-renderer-slider",
	props: {
		group: {
			type: String,
			required: false,
			default: "slider-default"
		},
		tag: {
			type: String,
			required: false
		}
	},
	data: function() {
		return {
			active: 0
		}
	},
	ready: function() {
		this.show();
	},
	methods: {
		show: function(index) {
			var counter = -1;
			var foundActive = false;
			var last = null;
			for (var i = 0; i < this.$slots.default.length; i++) {
				var node = this.$slots.default[i];
				if (node.tag != null) {
					counter++;
					last = counter;
					if (counter == index) {
						foundActive = true;
						this.active = counter;
						node.elm.classList.add("is-active");
					}
					else {
						node.elm.classList.remove("is-active");
					}
				}
			}
			if (!foundActive) {
				this.active = index < 0 ? last : 0;
				// unless you were attempting 0, show that one
				if (index != this.active) {
					this.show(this.active);
				}
			}
		},
		beforeEnter: function(element) {
			console.log("element is", element);
			element.style.opacity = 0;
		},
		previous: function() {
			this.show(this.active - 1);
		},
		next: function() {
			this.show(this.active + 1);
		}
	}
});
