Vue.component("page-field-fragment-data-configure", {
	template: "<page-formatted-configure :fragment='fragment' :allow-html='true' :cell='cell' :page='page'/>",
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
		}
	}
});

Vue.component("page-field-fragment-data", {
	template: "<page-formatted :value='value' :fragment='fragment' :cell='cell' :page='page'/>",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
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
		value: function() {
			// if we get values from the page, they don't have local state so get them there directly
			// the problem is: state is copied on creation but is no longer watched, so updating that state in the page does not reflect changes in the data
			// we could use a general refactor of the whole state model though...
			// but this is important enough to warrant a workaround because of content management going through page parameters now
			if (this.fragment.key && this.fragment.key.indexOf("page.") == 0) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return pageInstance.get(this.fragment.key);
			}
			return this.fragment.key ? this.$services.page.getValue(this.data, this.fragment.key) : null;
		}
	}
});