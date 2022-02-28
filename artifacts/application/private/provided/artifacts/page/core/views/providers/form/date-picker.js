Vue.component("page-form-input-date-picker-configure", {
	template: "<n-form-section>"
		+ "	<n-form-text v-model='field.minimumOffset' label='Minimum Offset' info='In days, the closest point in time that should be supported (can be negative)'/>"
		+ "	<n-form-text v-model='field.maximumOffset' label='Maximum Offset' info='In days, the furthest point in time that should be supported (can be negative)'/>"
		+ "	<n-form-text v-model='field.description' label='Description'/>"
		+ "	<n-form-switch v-model='field.allowPartial' label='Allow partial values' info='Allow partial values to be set (e.g. only year). If enabled, auto format is enabled as well.'/>"
		+ "	<n-form-switch v-model='field.autoFormat' v-if='!field.allowPartial' label='Auto format' info='The format is deduced from the requested fields, being gYear, gYearMonth or date'/>"
		+ "	<n-form-switch v-model='field.hideMonth' label='Show month' :invert='true' info='Show the month'/>"
		+ "	<n-form-switch v-model='field.hideDay' label='Show day' v-if='!field.hideMonth' :invert='true' info='Show the day'/>"
		+ "	<n-form-text v-model='field.placeholderYear' label='Place holder year'/>"
		+ "	<n-form-text v-model='field.placeholderMonth' v-if='!field.hideMonth' label='Place holder month'/>"
		+ "	<n-form-text v-model='field.placeholderDay' v-if='!field.hideDay && !field.hideMonth' label='Place holder day'/>"
		+ "	<n-page-mapper v-model='field.bindings' :from='availableParameters' :to='[\"allow\", \"default\", \"notBefore\", \"notAfter\"]'/>"
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
			+ "		:fields='fields'"
			+ "		:allow-partial='field.allowPartial'"
			+ "		:auto-format='field.autoFormat || field.allowPartial'"
			+ "		:placeholder-year='field.placeholderYear ? $services.page.translate(field.placeholderYear) : null'"
			+ "		:placeholder-month='field.placeholderMonth ? $services.page.translate(field.placeholderMonth) : null'"
			+ "		:placeholder-day='field.placeholderDay ? $services.page.translate(field.placeholderDay) : null'"
			+ "		:not-before='getNotBefore()'"
			+ "		:not-after='getNotAfter()'"
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
	computed: {
		fields: function() {
			var fields = ["year"];
			if (!this.field.hideMonth) {
				fields.push("month");
			}
			if (!this.field.hideDay) {
				fields.push("day");
			}
			return fields;
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
		getNotBefore: function () {
			if (this.field.bindings && this.field.bindings.notBefore) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return this.$services.page.getBindingValue(pageInstance, this.field.bindings.notBefore, this);
			}
		},
		getNotAfter: function () {
			if (this.field.bindings && this.field.bindings.getNotAfter) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return this.$services.page.getBindingValue(pageInstance, this.field.bindings.getNotAfter, this);
			}
		},
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		}
	}
});