Vue.component("page-form-input-date-picker-configure", {
	template: "<n-form-section>"
		+ "	<n-form-text v-model='field.minimumOffset' label='Minimum Offset'/>"
		+ "	<n-form-text v-model='field.maximumOffset' label='Maximum Offset'/>"
		+ "	<n-form-text v-model='field.description' label='Description'/>"
		+ "	<n-page-mapper v-model='field.bindings' :from='availableParameters' :to='[\"allow\", \"default\"]'/>"
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
	created: function () {
		if (!this.field.bindings) {
			Vue.set(this.field, "bindings", {});
		}
	},
	computed: {
		availableParameters: function() {
			return this.$services.page.getAvailableParameters(this.page, this.cell, true);
		}
	}
});

Vue.component("page-form-input-date-picker", {
	template: "<n-form-date-picker ref='form'"
			+ "		:description='field.description ? $services.page.translate(field.description) : null'"
			+ "		:placeholder='placeholder'"
			+ "		:edit='!readOnly'"
			+ "		:schema='schema'"
			+ "		v-bubble:label"
			+ "		:minimum-offset='field.minimumOffset'"
			+ "		:maximum-offset='field.maximumOffset'"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:label='field.label ? $services.page.translate(field.label) : null'"
			+ "		:value='value'"
			+ "		:default='getDefault()'"
			+ "		:timeout='timeout'"
			+ "		:description='field.description ? $services.page.translate(field.description) : null'"
			+ "		:description-type='field.descriptionType'"
			+ "		:description-icon='field.descriptionIcon'"
			+ "		:allow='getAllow()'"
			+ "		v-bubble:blur"
			+ "		:include-hours='field.includeHours'"
			+ "		:pattern-comment='$services.page.translate(field.regexLabel)'"
			+ "		:include-minutes='field.includeHours && field.includeMinutes'"
			+ "		:include-seconds='field.includeHours && field.includeMinutes && field.includeSeconds'"
			+ "		:timestamp='field.isTimestamp'"
			+ "		:seconds-timestamp='field.isSecondsTimestamp'"
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
		},
		placeholder: {
			type: String,
			required: false
		}
	},
	methods: {
		getDefault: function() {
			if (this.field.bindings && this.field.bindings.default) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return this.$services.page.getBindingValue(pageInstance, this.field.bindings.default, this);
			}
		},
		getAllow: function () {
			if (this.field.bindings && this.field.bindings.allow) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return this.$services.page.getBindingValue(pageInstance, this.field.bindings.allow, this);
			}
		},
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		}
	}
});