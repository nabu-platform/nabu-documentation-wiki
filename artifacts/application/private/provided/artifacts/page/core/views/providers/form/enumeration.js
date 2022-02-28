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
			+ "	<n-form-text v-model='field.info' label='Info Content'/>"
			+ "	<n-form-text v-model='field.before' label='Before Content'/>"
			+ "	<n-form-text v-model='field.beforeIcon' label='Before Icon' v-if='field.before'/>"
			+ "	<n-form-text v-model='field.after' label='After Content'/>"
			+ "	<n-form-text v-model='field.afterIcon' label='After Icon' v-if='field.after'/>"
			+ "	<n-form-text v-model='field.suffix' label='Suffix' v-if='!field.suffixIcon'/>"
			+ "	<n-form-text v-model='field.suffixIcon' label='Suffix Icon' v-if='!field.suffix'/>"
		+ "		<button @click='addEnumeration'>Add enumeration</button>"
		+ "		<div v-if='!field.complex'><n-form-section class='enumeration list-row' v-for='i in Object.keys(field.enumerations)' :key=\"field.name + 'enumeration_' + i\">"
		+ "			<n-form-text v-model='field.enumerations[i]'/>"
		+ "			<button @click='field.enumerations.splice(i, 1)'><span class='fa fa-trash'></span></button>"
		+ "		</n-form-section></div>"
		+ "		<div v-else><n-form-section class='enumeration list-row' v-for='i in Object.keys(field.enumerations)' :key=\"field.name + 'enumeration_' + i\">"
		+ "			<n-form-text v-model='field.enumerations[i].key' placeholder='Value' :timeout='600'/>"
		+ "			<n-form-text v-model='field.enumerations[i].value' placeholder='Label' :timeout='600'/>"
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
			+ "		:info='field.info ? $services.page.translate(field.info) : null'"
			+ "		:before='field.before ? $services.page.translate(field.before) : null'"
			+ "		:after='field.after ? $services.page.translate(field.after) : null'"
			+ "		:suffix='field.suffixIcon ? $services.page.getIconHtml(field.suffixIcon) : field.suffix'"
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
			+ "		:info='field.info ? $services.page.translate(field.info) : null'"
			+ "		:before='field.before ? $services.page.translate(field.before) : null'"
			+ "		:after='field.after ? $services.page.translate(field.after) : null'"
			+ "		:suffix='field.suffixIcon ? $services.page.getIconHtml(field.suffixIcon) : field.suffix'"
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
				// probably not used because we already resolve interpretations in the enumerate (?)
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
			var self = this;
			var result = this.field.enumerations.map(function(x) {
				if(typeof(x) == "string"){
					return "" + (x && x.indexOf("=") == 0 ? self.$services.page.interpret(x, self) : x);
				}
				else {
					x = nabu.utils.objects.clone(x);
					x.value = "" + (x && x.value && x.value.indexOf("=") == 0 ? self.$services.page.interpret(x.value, self) : x.value);
					return x;
				}
			}).filter(function(x) {
				if(typeof(x) == "string"){
					return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				}
				else {
					return !value || x.value.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				}
			});
			if (this.field.allowCustom && result.indexOf(value) < 0) {
				result.unshift(value);
			}
			return result;
		}
	}
});