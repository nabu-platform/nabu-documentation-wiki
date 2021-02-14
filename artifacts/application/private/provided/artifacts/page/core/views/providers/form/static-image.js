Vue.component("page-form-input-static-image-configure", {
	template: "<n-form-section><n-form-text v-model='field.imagePath' label='Image Path'/><n-form-text v-model='field.webApplicationId' label='Web Application Id'/></n-form-section>",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		field: {
			type: Object,
			required: true
		}
	},
	created: function() {
		if (!this.field.imagePath) {
			Vue.set(this.field, "imagePath", "images")
		}
	}
});

Vue.component("page-form-input-static-image", {
	template: "<div class='page-form-input-static-image n-form-component'><label class='n-form-label' v-if='label'>{{label}}</label><div class='image-content'><img v-if='value' :src=\"(field.webApplicationId ? '' : '${server.root()}') + value\"/>"
		+ "<n-input-file v-if='!readOnly' v-model='files' @change='upload' :types=\"['image']\"/></div></div>",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		field: {
			type: Object,
			required: true
		},
		value: {
			required: true
		},
		label: {
			type: String,
			required: false
		},
		timeout: {
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		schema: {
			type: Object,
			required: false
		},
		readOnly: {
			type: Boolean,
			required: false
		}
	},
	data: function() {
		return {
			files: []
		}
	},
	methods: {
		upload: function() {
			var self = this;
			this.$services.swagger.execute("nabu.web.page.core.rest.resource.create", {
				webApplicationId: this.$services.page.interpret(this.field.webApplicationId, this),
				path: this.$services.page.interpret(this.field.imagePath, this), 
				body: this.files[0] 
			}).then(function(result) {
				self.files.splice(0, self.files.length);
				self.$emit("input", this.field.webApplicationId ? result.path : result.relativePath);
			});
		},
	}
});
