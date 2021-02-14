Vue.component("page-form-input-enumeration-configure", {
	template: "<n-form-section>"
		+ " 	<n-form-switch v-model='field.showRadioView' label='Show radio visualisation'/>"
		+ " 	<n-form-switch v-model='field.complex' label='Complex Values' v-if='!field.allowCustom'/>"
		+ " 	<n-form-switch v-model='field.icon' v-if='field.showRadioView' label='Icon (instead of radio)'/>"
		+ " 	<n-form-switch v-model='field.iconAlt' v-if='field.showRadioView && field.icon' label='Icon (when not selected)'/>"
		+ " 	<n-form-switch v-if='!field.showRadioView' v-model='field.forceValue' label='Force Any Value' />"
		+ "		<n-form-switch v-if='!field.complex' v-model='field.allowCustom' label='Allow Custom Values'/>"
		+ "		<n-form-combo v-model='field.required' label='Required' :items=\"[true,false]\" />"
		+ "		<n-form-combo v-if='field.showRadioView' v-model='field.mustChoose' label='Must choose' :items=\"[true,false]\" />"
		+ "		<n-form-text v-model='field.description' label='Description'/>"
		+ "		<n-form-combo v-model='field.descriptionType' label='Description type' :items=\"['before','after','info']\" />"
		+ "		<n-form-text v-model='field.descriptionIcon' label='Description icon'/>"
		+ "		<button @click='addEnumeration'>Add enumeration</button>"
		+ "		<div v-if='!field.complex'><n-form-section class='enumeration list-row' v-for='i in Object.keys(field.enumerations)' :key=\"field.name + 'enumeration_' + i\">"
		+ "			<n-form-text v-model='field.enumerations[i]'/>"
		+ "			<button @click='field.enumerations.splice(i, 1)'><span class='fa fa-trash'></span></button>"
		+ "		</n-form-section></div>"
		+ "		<div v-else><n-form-section class='enumeration list-row' v-for='i in Object.keys(field.enumerations)' :key=\"field.name + 'enumeration_' + i\">"
		+ "			<n-form-text v-model='field.enumerations[i].key' placeholder='key'/>"
		+ "			<n-form-text v-model='field.enumerations[i].value' placeholder='value'/>"
		+ "			<button @click='field.enumerations.splice(i, 1)'><span class='fa fa-trash'></span></button>"
		+ "		</n-form-section>"
		+ "	</div></n-form-section>",
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
		if (!this.field.enumerations) {
			Vue.set(this.field, "enumerations", []);
		}
	},
	methods: {
		addEnumeration: function() {
			if (this.field.complex) {
				this.field.enumerations.push({value:null,key:null});
			}
			else {
				this.field.enumerations.push('');
			}
		}
	},
	watch: {
		'field.complex': function(newValue) {
			if (newValue) {
				Vue.set(this.field, "enumerations", this.field.enumerations.splice(0).map(function(x) {
					if (typeof(x) == "string") {
						return {key:x, value: null};
					}
					else {
						return x;
					}
				}));
			}
			else {
				Vue.set(this.field, "enumerations", this.field.enumerations.splice(0).map(function(x) {
					if (typeof(x) != "string") {
						return x.key;
					}
					else {
						return x;
					}
				}));
			}
		}
	}
});

Vue.component("page-form-input-enumeration", {
	template: "<div><n-form-radio v-if='field.showRadioView' :items='field.enumerations' ref='form'"
			+ "		:edit='!readOnly'"
			+ "		:placeholder='placeholder'"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:formatter='formatter'"
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		:icon='field.icon'"
			+ "		:icon-alt='field.iconAlt'"
			+ "		:description='field.description ? $services.page.translate(field.description) : null'"
			+ "		:description-type='field.descriptionType'"
			+ "		:description-icon='field.descriptionIcon'"
			+ "		:schema='schema'"
			+ "		v-bubble:label"
			+ "		:required='field.required'"
			+ "		:must-choose='field.mustChoose ? $services.page.interpret(field.mustChoose, $self) : null'"
			+ "		:extracter='extracter'"
			+ "		:disabled='disabled'/>"
			+ "<n-form-combo v-else :filter='enumerate' ref='form'"
			+ "		:edit='!readOnly'"
			+ "		:nillable='!field.forceValue'"
			+ "		:placeholder='placeholder'"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:formatter='formatter'"
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		v-bubble:label"
			+ "		v-bubble:blur"
			+ "		:description='field.description ? $services.page.translate(field.description) : null'"
			+ "		:description-type='field.descriptionType'"
			+ "		:description-icon='field.descriptionIcon'"
			+ "		:schema='schema'"
			+ "		:required='field.required'"
			+ "		:extracter='extracter'"			
			+ "		:disabled='disabled'/>"
			+ " </div>",
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
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		},
		formatter: function(value) {
			if (typeof(value) == "string") {
				return value;
			}
			else if (value) {
				if (value.value) {
					return this.$services.page.interpret(this.$services.page.translate(value.value, this), this);
				}
				else {
					return value.key;
				}
			}
		},
		extracter: function(value) {
			if (typeof(value) == "string") {
				return value;
			}
			else if (value) {
				if (value.key) {
					return this.$services.page.interpret(value.key, this);
				}
				else {
					return value.value;
				}
			}
		},
		enumerate: function(value) {
			var result = this.field.enumerations.filter(function(x) {
				return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
			});
			if (this.field.allowCustom && result.indexOf(value) < 0) {
				result.unshift(value);
			}
			return result;
		}
	}
});