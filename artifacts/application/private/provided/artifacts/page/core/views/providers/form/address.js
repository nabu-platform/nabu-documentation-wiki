Vue.component("page-form-input-address-configure", {
	template: "<n-form-section>"
		+ "	<n-form-text v-model='field.countryRestriction' label='Country limitation (two letter code, comma separated)'/>"
		+ "	<n-form-combo v-model='field.latitude' label='Latitude Field' :filter='getKeys'/>"
		+ "	<n-form-combo v-model='field.longitude' label='Longitude Field' :filter='getKeys'/>"
		+ "	<n-form-combo v-model='field.country' label='Country Field' :filter='getKeys'/>"
		+ "	<n-form-combo v-model='field.countryCode' label='Country Code Field' :filter='getKeys'/>"
		+ "	<n-form-combo v-model='field.city' label='City Field' :filter='getKeys'/>"
		+ "	<n-form-combo v-model='field.postCode' label='Post Code Field' :filter='getKeys'/>"
		+ "	<n-form-combo v-model='field.street' label='Street Field' :filter='getKeys'/>"
		+ "	<n-form-combo v-model='field.additional' label='Additional Field' :filter='getKeys'/>"
		+ "	<n-form-combo v-model='field.streetNumber' label='Street Number Field' :filter='getKeys' v-if='!field.streetIncludeNumber'/>"
		+ "	<n-form-text v-model='field.countryLabel' label='Country Label' />"
		+ "	<n-form-text v-model='field.cityLabel' label='City Label' />"
		+ "	<n-form-text v-model='field.postCodeLabel' label='Postcode Label' />"
		+ "	<n-form-text v-model='field.streetLabel' label='Street Label' />"
		+ "	<n-form-text v-model='field.streetNumberLabel' label='Street Number Label' />"
		+ "	<n-form-text v-model='field.additionalLabel' label='Additional Label' />"
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
		},
		possibleFields: {
			type: Array,
			required: false,
			default: function() { return [] }
		}
	},
	created: function() {
		if (!this.field.textType) {
			Vue.set(this.field, "textType", null);
		}
	},
	methods: {
		getKeys: function(value) {
			return this.possibleFields.filter(function(x) {
				return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
			})
		}
	}
});

Vue.component("page-form-input-address", {
	template: "<n-form-address ref='form'"
			+ "		:edit='!readOnly'"
			+ "		:placeholder='placeholder'"
			+ "		:schema-resolver='schemaResolver'"
			+ "		v-bubble:label"
			+ "		v-bubble:changed"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		:description='field.description ? $services.page.translate(field.description) : null'"
			+ "		:description-type='field.descriptionType'"
			+ "		:description-icon='field.descriptionIcon'"
			+ "		:name='field.name'"
			+ "		:timeout='timeout ? timeout : 400'"
			+ "     :latitude='field.latitude'"
			+ "     :longitude='field.longitude'"
			+ "     :country='field.country'"
			+ "     :country-code='field.countryCode'"
			+ "     :city='field.city'"
			+ "     :post-code='field.postCode'"
			+ "     :street='field.street'"
			+ "     :street-number='field.streetNumber'"
			+ "     :additional='field.additional'"
			+ "     :country-label='$services.page.translate(field.countryLabel)'"
			+ "     :city-label='$services.page.translate(field.cityLabel)'"
			+ "     :post-code-label='$services.page.translate(field.postCodeLabel)'"
			+ "     :street-label='$services.page.translate(field.streetLabel)'"
			+ "     :street-number-label='$services.page.translate(field.streetNumberLabel)'"
			+ "     :additional-label='$services.page.translate(field.additionalLabel)'"
			+ "		:country-restriction='field.countryRestriction'"
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
		schemaResolver: {
			type: Function,
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
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		}
	}
});