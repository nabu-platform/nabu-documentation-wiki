Vue.component("page-field-fragment-text-configure", {
	template: "<n-form-section>"
		+ "		<n-form-switch label='Multiline' v-model='fragment.multiline'/>"
		+ "		<n-form-switch label='Compile' v-model='fragment.compile'/>"
		+ "		<n-form-combo label='Type' v-model='fragment.tag' :items=\"['span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div']\"/>"
		+ "		<n-form-text label='Text' :type=\"fragment.multiline ? 'area' : 'text'\" v-model='fragment.content'/>"
		+ "</n-form-section>",
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
	},
	created: function() {
		if (!this.fragment.multiline) {
			Vue.set(this.fragment, "multiline", false);
		}
		if (!this.fragment.content) {
			Vue.set(this.fragment, "content", null);
		}
		if (!this.fragment.tag) {
			Vue.set(this.fragment, "tag", null);
		}
	}
});

Vue.component("page-field-fragment-text", {
	template: "<component :is='tag' v-content.parameterized='{value:$services.page.translate(fragment.content), compile:fragment.compile, plain:true}'/>",
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
		tag: function() {
			if (this.fragment.tag) {
				return this.fragment.tag;	
			}
			else {
				return "span";
			}
		}
	}
});