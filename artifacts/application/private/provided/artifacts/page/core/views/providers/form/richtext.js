Vue.component("page-form-input-richtext-configure", {
	template: "<n-form-section><n-form-switch v-model='field.cleanStyle' label='Clean style on paste'/><n-form-switch v-model='field.supportLinkType' label='Support Link Types'/></n-form-section>",
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
		field: {
			type: Object,
			required: true
		}
	}
});

Vue.component("page-form-input-richtext", {
	template: "<n-form-richtext :support-link-type='field.supportLinkType' :label='label' :timeout='timeout' :edit='!readOnly' ref='form' :value='value' @input=\"function(value) { $emit('input', value) }\" :schema='schema' :clean-style='field.cleanStyle'/>",
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
	methods: {
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		}
	}
});