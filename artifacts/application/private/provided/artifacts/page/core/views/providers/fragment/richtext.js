Vue.component("page-field-fragment-richtext-configure", {
	template: "<n-form-section><n-form-richtext v-model='fragment.content'/>"
		+ "		<n-form-switch label='Compile' v-model='fragment.compile'/>"
		+ "	</n-form-section>",
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
		if (!this.fragment.content) {
			Vue.set(this.fragment, "content", null);
		}
	}
});

Vue.component("page-field-fragment-richtext", {
	template: "<div v-content.parameterized='{value:$services.page.translate(fragment.content), sanitize:true, compile: fragment.compile }'></div>",
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
	}
});