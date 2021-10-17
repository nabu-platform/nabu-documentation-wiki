Vue.component("page-form-input-text-configure", {
	template: "<n-form-section><n-form-combo v-model='field.textType' label='Text Type' :items=\"['text', 'area', 'range', 'number', 'color', 'email', 'password']\"/>"
		+ "	<n-form-text v-model='field.regexLabel' label='Regex Label' :timeout='600'/>"
		+ "	<n-form-text v-model='field.regex' label='Regex' :timeout='600'/>"
		+ "	<n-form-text v-model='field.minLength' label='Min Length' :timeout='600'/>"
		+ "	<n-form-text v-model='field.maxLength' label='Max Length' :timeout='600'/>"
		+ "	<n-form-switch v-model='field.showLength' label='Show Length' v-if='field.maxLength'/>"
		+ "	<n-form-combo v-model='field.required' label='Required' :items=\"[true,false]\" />"
		+ "	<n-form-text v-model='field.info' label='Info Content' :timeout='600'/>"
		+ "	<n-form-text v-model='field.before' label='Before Content' :timeout='600'/>"
		+ "	<n-form-text v-model='field.beforeIcon' label='Before Icon' v-if='field.before' :timeout='600'/>"
		+ "	<n-form-text v-model='field.after' label='After Content' :timeout='600'/>"
		+ "	<n-form-text v-model='field.afterIcon' label='After Icon' v-if='field.after' :timeout='600'/>"
		+ "	<n-form-text v-model='field.suffix' label='Suffix' v-if='!field.suffixIcon' :timeout='600'/>"
		+ "	<n-form-text v-model='field.suffixIcon' label='Suffix Icon' v-if='!field.suffix' :timeout='600'/>"
		+ "	<n-form-text v-model='field.minimum' label='Minimum' v-if=\"field.textType == 'range' || field.textType == 'number'\" :timeout='600'/>"
		+ "	<n-form-text v-model='field.maximum' label='Maximum' v-if=\"field.textType == 'range' || field.textType == 'number'\" :timeout='600'/>"
		+ "	<n-form-text v-model='field.step' label='Step' v-if=\"field.textType == 'range'\" :timeout='600'/>"
		+ "	<n-page-mapper v-model='field.bindings' :from='availableParameters' :to='[\"validator\"]'/>"
		+ "	<h2>Validation Codes<span class='subscript'>You can remap validation codes with different messages here</span></h2>"
		+ "		<div v-if='field.codes'>"
		+ "			<div class='list-row' v-for='code in field.codes' :timeout='600'>"
		+ "				<n-form-text v-model='code.code' label='Code' :timeout='600'/>"
		+ "				<n-form-text v-model='code.title' label='Title' :timeout='600'/>"
		+ "				<span @click='field.codes.splice(field.codes.indexOf(code), 1)' class='fa fa-times'></span>"
		+ "			</div>"
		+ "		</div>"
		+ "		<div class='list-actions'>"
		+ "			<button @click=\"field.codes ? field.codes.push({code:null,title:null}) : $window.Vue.set(field, 'codes', [{code:null,title:null}])\">Add code</button>"           
		+ "		</div>"
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
		field: {
			type: Object,
			required: true
		}
	},
	created: function() {
		if (!this.field.textType) {
			Vue.set(this.field, "textType", null);
		}
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

Vue.component("page-form-input-text", {
	template: "<n-form-text :type='textType' ref='form'"
			+ "		:codes='allCodes'"
			+ "		:class=\"{'has-suffix-icon': !!field.suffixIcon, 'has-suffix': !!field.suffix }\""
			+ "		:edit='!readOnly'"
			+ "		:placeholder='placeholder'"
			+ "		:max-length='field.maxLength ? field.maxLength : null'"
			+ "		:min-length='field.minLength ? field.minLength : null'"
			+ "		:schema='schema'"
			+ "		:pattern-comment='field.regexLabel ? $services.page.translate(field.regexLabel) : null'"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		:pattern='field.regex'"
			+ "		v-bubble:blur"
			+ "		:required='field.required'"
			+ "		:validator='getValidator()'"
			+ "		:info='field.info ? $services.page.translate(field.info) : null'"
			+ "		:before='field.before ? $services.page.translate(field.before) : null'"
			+ "		:after='field.after ? $services.page.translate(field.after) : null'"
			+ "		:suffix='field.suffixIcon ? $services.page.getIconHtml(field.suffixIcon) : field.suffix'"
			+ "		:minimum='field.minimum ? parseFloat($services.page.interpret(field.minimum, $self)) : null'"
			+ "		:maximum='field.maximum ? parseFloat($services.page.interpret(field.maximum, $self)) : null'"
			+ "		:step='field.step ? parseFloat($services.page.interpret(field.step, $self)) : null'"
			+ "		:name='field.name'"
			+ "		:timeout='timeout'"
			+ "		v-show='!hidden'"
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
		},
		codes: {
			required: false
		},
		hidden: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	computed: {
		allCodes: function() {
			var codes = [];
			if (this.field.codes) {
				nabu.utils.arrays.merge(codes, this.field.codes);
			}
			if (this.codes) {
				nabu.utils.arrays.merge(codes, this.codes);
			}
			var result = {};
			var self = this;
			codes.forEach(function(code) {
				result[code.code] = self.$services.page.translate(code.title);
			});
			return result;
		},
		textType: function() {
			return this.field.textType ? this.field.textType : 'text';
		}
	},
	methods: {
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		},
		getValidator: function() {
			if (this.field.bindings && this.field.bindings.validator) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return this.$services.page.getBindingValue(pageInstance, this.field.bindings.validator, this);
			}
		}
	}
});


Vue.component("page-form-input-hidden", {
	template: "<page-form-input-text :cell='cell' :page='page' :field='field' :value='value' :label='label' :timeout='timeout' "
		+ ":disabled='disabled' :schema='schema' :read-only='readOnly' :placeholder='placeholder' :codes='codes' :hidden='true'/>",
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
		},
		codes: {
			required: false
		}
	}
});
