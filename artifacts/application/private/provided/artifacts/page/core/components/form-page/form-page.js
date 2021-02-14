Vue.component("n-form-page", {
	template: "#n-form-page",
	props: {
		value:  {
			required: true
		},
		timeout: {
			type: Number,
			required: false,
			default: 600
		}
	},
	data: function() {
		return {
			page: null,
			timer: null
		}
	},
	created: function() {
		var counter = this.$services.page.counter++;
		this.page = {
			name: "dynamic-page-" + counter,
			counter: counter,
			content: this.$services.page.normalize(typeof(this.value) == "string" ? JSON.parse(this.value) : {})
		};
	},
	methods: {
		update: function() {
			var content = JSON.stringify(this.page.content);
			if (content != this.value) {
				this.$emit("input", content);
			}
		},
		validate: function() {
			return [];
		}
	},
	watch: {
		page: {
			handler: function(newValue) {
				if (this.timer) {
					clearTimeout(this.timer);
					this.timer = null;
				}
				this.timer = setTimeout(this.update, this.timeout);
			},
			deep: true
		}
	}
});