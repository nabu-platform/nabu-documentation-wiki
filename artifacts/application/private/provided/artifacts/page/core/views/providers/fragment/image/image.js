Vue.component("page-field-fragment-image-configure", {
	template: "#page-field-fragment-image-configure",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		// the fragment this image is in
		fragment: {
			type: Object,
			required: true
		},
		// available data keys
		// this could be generated for cell/page but could also be provided by a wrapper component
		keys: {
			type: Array,
			required: true
		}
	},
	methods: {
		getOperations: function(value) {
			return this.$services.page.getOperations(function(operation) {
				if (!value || operation.id.toLowerCase().indexOf(value.toLowerCase()) >= 0) {
					return true;
				}
				return false;
			});
		},
		getOperationParameters: function(operation) {
			return this.$services.page.getSwaggerParametersAsKeys(operation);
		},
		getAvailableParameters: function() {
			var result = this.$services.page.getAvailableParameters(this.page, null, true);
			if (this.keys.length) {
				var record = {};
				this.keys.forEach(function(x) {
					record[x] = {type: "string"};
				});
				result.record = {properties:record};
			}
			return result;
		}
	},
	created: function() {
		if (!this.fragment.fixedHref) {
			Vue.set(this.fragment, "fixedHref", false);
		}
		if (!this.fragment.imageHref) {
			Vue.set(this.fragment, "imageHref", null);
		}
		if (!this.fragment.imageTitle) {
			Vue.set(this.fragment, "imageTitle", null);
		}
		if (!this.fragment.imageHeight) {
			Vue.set(this.fragment, "imageHeight", null);
		}
		if (!this.fragment.imageSize) {
			Vue.set(this.fragment, "imageSize", 'cover');
		}
		if (!this.fragment.bindings) {
			Vue.set(this.fragment, "bindings", {});
		}
	}
});

Vue.component("page-field-fragment-image", {
	template: "<div class='image' :style=\"{'background-image': 'url(' + href + ')', height: fragment.imageHeight ? fragment.imageHeight : 'inherit', 'background-size': fragment.imageSize, 'background-repeat': 'no-repeat', 'background-position': 'center' }\"></div>",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		// the fragment this image is in
		fragment: {
			type: Object,
			required: true
		},
		data: {
			type: Object,
			required: true
		}
	},
	computed: {
		href: function() {
			var href = null;
			if (this.fragment.operationParameter) {
				if (this.fragment.operation) {
					var parameters = {};
					var self = this;
					var pageInstance = this.$services.page.getPageInstance(this.page, this);
					Object.keys(this.fragment.bindings).forEach(function(key) {
						if (self.fragment.bindings[key]) {
							if (self.fragment.bindings[key].indexOf("record.") == 0) {
								parameters[key] = self.$services.page.getValue(self.data, self.fragment.bindings[key].substring("record.".length));
							}
							else {
								parameters[key] = self.$services.page.getBindingValue(pageInstance, self.fragment.bindings[key]);
							}
						}
					})
					var properties = this.$services.swagger.parameters(this.fragment.operation, parameters);
					return properties.url;
				}
			}
			else {
				if (this.fragment.fixedHref) {
					href = this.fragment.imageHref;
				}
				else if (this.fragment.imageHref) {
					href = this.$services.page.getValue(this.data, this.fragment.imageHref);
				}
				// we assume the data is base64encoded
				if (href && this.fragment.dataUrl) {
					href = URL.createObjectURL(href);
				}
				// if the href is not an absolute one (either globally absolute or application absolute), we inject the server root
				else if (href && href.substring(0, 7) != "http://" && href.substring(0, 8) != "https://" && href.substring(0, 1) != "/") {
					href = "${server.root()}" + href;
				}
			}
			return href;
		}
	}
});