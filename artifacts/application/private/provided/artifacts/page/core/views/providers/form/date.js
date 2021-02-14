Vue.component("page-form-input-date-configure", {
	template: "<n-form-section>"
		+ "	<n-form-switch v-model='field.yearsDropdown' label='Show years in dropdown'/>"
		+ "	<n-form-switch v-model='field.includeHours' label='Include hours?'/>"
		+ "	<n-form-switch v-model='field.includeMinutes' label='Include minutes?' v-if='field.includeHours'/>"
		+ "	<n-form-switch v-model='field.includeSeconds' label='Include seconds?' v-if='field.includeHours && field.includeMinutes'/>"
		+ "	<n-form-switch v-model='field.isTimestamp' label='Is a timestamp in milliseconds?' v-if='!field.isSecondsTimestamp'/>"
		+ "	<n-form-switch v-model='field.isSecondsTimestamp' label='Is a timestamp in seconds?' v-if='!field.isTimestamp'/>"
		+ "	<n-form-text v-model='field.regexLabel' label='Regex label'/>"
		+ "	<n-page-mapper v-model='field.bindings' :from='availableParameters' :to='[\"allow\", \"default\",\"formatter\",\"parser\"]'/>"
		+ "	<n-form-combo v-model='field.required' label='Required' :items=\"[true,false]\" />"
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

Vue.component("page-form-input-date", {
	template: "<n-form-date ref='form'"
			+ "		:placeholder='placeholder'"
			+ "		:edit='!readOnly'"
			+ "		:schema='schema'"
			+ "		v-bubble:label"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		:default='getDefault()'"
			+ "		:timeout='timeout'"
			+ "		v-bubble:blur"
			+ "		:allow='getAllow()'"
			+ "		:years-dropdown='field.yearsDropdown'"
			+ "		:include-hours='field.includeHours'"
			+ "		:pattern-comment='$services.page.translate(field.regexLabel)'"
			+ "		:include-minutes='field.includeHours && field.includeMinutes'"
			+ "		:include-seconds='field.includeHours && field.includeMinutes && field.includeSeconds'"
			+ "		:timestamp='field.isTimestamp'"
			+ "		:seconds-timestamp='field.isSecondsTimestamp'"
			+ "		:required='field.required'"
			+ "		:formatter='getFormatter()'"
			+ "		:parser='getParser()'"
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
		getParser: function () {
			if (this.field.bindings && this.field.bindings.parser) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return this.$services.page.getBindingValue(pageInstance, this.field.bindings.parser, this);
			}
		},
		getFormatter: function () {
			if (this.field.bindings && this.field.bindings.formatter) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return this.$services.page.getBindingValue(pageInstance, this.field.bindings.formatter, this);
			}
		},
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		}
	}
});