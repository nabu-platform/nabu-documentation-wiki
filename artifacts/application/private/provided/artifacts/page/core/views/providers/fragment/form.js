Vue.component("page-field-fragment-form-configure", {
	template: "<n-form-section><page-form-configure-single :field='fragment.form' :possible-fields='keys'"
					+ "		:allow-label='false'"
					+ "		:allow-description='false'"
					+ "		:page='page'"
					+ "		:cell='cell'/><n-form-text v-model='fragment.disabled' label='Disabled If'/></n-form-section>",
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
		fragment: {
			type: Object,
			required: true
		},
		keys: {
			type: Array,
			required: true
		}
	},
	created: function() {
		if (!this.fragment.form) {
			Vue.set(this.fragment, "form", {});
		}
		if (!this.fragment.disabled) {
			Vue.set(this.fragment, "disabled", null);
		}
	}
});

Vue.component("page-field-fragment-form", {
	template: "<page-form-field :key=\"fragment.form.name + '_value'\" :field='fragment.form'" 
				+ "		:value='formValue(fragment)'"
				+ "		:parent-value='data'"
				+ "		@input='function(newValue) { updateForm(fragment, newValue) }'"
				+ "		:label='false'"
				+ "		:page='page'"
				+ "		:cell='cell'"
				+ "		:is-disabled='!!fragment.disabled && $services.page.isCondition(fragment.disabled, {record:data}, $self)'/>",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		fragment: {
			type: Object,
			required: true
		},
		data: {
			type: Object,
			required: true
		}
	},
	methods: {
		formValue: function(fragment) {
			if (fragment.form.name) {
				return this.data[fragment.form.name];
			}
		},
		updateForm: function(fragment, newValue) {
			Vue.set(this.data, fragment.form.name, newValue);
			this.$emit("updated", fragment.form.name);
		}
	}
});