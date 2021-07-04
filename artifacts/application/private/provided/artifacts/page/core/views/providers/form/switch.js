Vue.component("page-form-input-switch-configure", {
	template: "<div>"
		+ "	<n-form-switch v-model='field.invert' label='Invert Boolean'/>"
		+ "</div>",
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
	}
});

Vue.component("page-form-input-switch", {
	template: "<n-form-switch ref='form'"
			+ "		:edit='!readOnly'"
			+ "		:schema='schema'"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		:timeout='timeout'"
			+ "		:invert='!!field.invert'"
			+ "		:disabled='disabled'/>",
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
		// currently not implemented for switch
		/*validate: function(soft) {
			return this.$refs.form.validate(soft);
		}*/
	}
});