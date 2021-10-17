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
	// the "state" is already a workaround to allow access to the data-specific state (e.g. in a data-card) via "state.firstName" logic
	// however, the global mixin for state management will enrich the state with "page" and "application" etc, and by reference update the state passed in here
	// this in turn meant that if you used a page form on the same data, which was now "corrupted" with page & application data
	// could no longer build a reference stringified string because it would end in a circularreferenceerror
	// as a workaround, the "data" that was passed in as state, is now cloned first
	// once again: state HAS TO GO
	template: "<page-formatted :value='value' :fragment='fragment' :cell='cell' :page='page' :state='$window.nabu.utils.objects.clone(data)'/>",
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
			if (this.fragment.key && (this.fragment.key.indexOf("page.") == 0 || this.fragment.key.indexOf("parent.") == 0)) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return pageInstance.get(this.fragment.key);
			}
			return this.fragment.key ? this.$services.page.getValue(this.data, this.fragment.key) : null;
		}
	}
});