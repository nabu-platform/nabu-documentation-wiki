Vue.component("page-form-input-checkbox-configure", {
	template: "<div><n-form-switch v-model='field.mustCheck' label='Must Check'/>"
			+ "<n-form-text v-model='field.info' label='Info Content'/>" 
			+ "<n-form-text v-model='field.infoIcon' label='Info Icon'/></div>",
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

Vue.component("page-form-input-checkbox", {
	template: "<n-form-checkbox ref='form'"
			+ "		:edit='!readOnly'"
			+ "		:schema='schema'"
			+ "		:info-icon='field.infoIcon'"
			+ "		:info='$services.page.translate(field.info)'"
			+ "		:must-check='field.mustCheck'"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		:timeout='timeout'"
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
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		}
	}
});