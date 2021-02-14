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
			if (this.fragment.fixedHref) {
				href = this.fragment.imageHref;
			}
			else if (this.fragment.imageHref) {
				href = this.$services.page.getValue(this.data, this.fragment.imageHref);
			}
			// if the href is not an absolute one (either globally absolute or application absolute), we inject the server root
			if (href && href.substring(0, 7) != "http://" && href.substring(0, 8) != "https://" && href.substring(0, 1) != "/") {
				href = "${server.root()}" + href;
			}
			return href;
		}
	}
});