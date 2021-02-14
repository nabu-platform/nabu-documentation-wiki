Vue.component("page-form-input-slider-configure", {
	template: "<n-form-section>"
		+ "	<n-form-text v-model='field.minimum' label='Minimum' :required='true' type='number'/>"
		+ "	<n-form-text v-model='field.maximum' label='Maximum' :required='true' type='number'/>"
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
		field: {
			type: Object,
			required: true
		}
	},
	created: function() {
		if (!this.field.textType) {
			Vue.set(this.field, "textType", null);
		}
	}
});

Vue.component("page-form-input-slider", {
	template: "<n-form-text type='range' ref='form'"
			+ "		:edit='!readOnly'"
			+ "		:minimum='field.minimum ? parseInt(field.minimum) : 0'"
			+ "		:maximum='field.maximum ? parseInt(field.maximum) : 100'"
			+ "		:schema='schema'"
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
	computed: {
		textType: function() {
			return this.field.textType ? this.field.textType : 'text';
		}
	},
	methods: {
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		}
	}
});