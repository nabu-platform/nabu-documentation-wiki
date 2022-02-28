// TODO: for simple lists: generate a new page-form-configure-single entity but with isList not filled in

Vue.component("page-form-list-input-dynamic-configure", {
	template: "<div><n-form-text v-model='field.buttonAddClass' placeholder='primary' label='Button Add Class'/><n-form-text v-if='false' v-model='field.buttonRemoveClass' placeholder='secondary' label='Button Remove Class'/></div>",
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
	}
});

Vue.component("page-form-list-input-dynamic", {
	template: "<n-form-section ref='form' class='dynamic-input'>"
					+ "		<div class='dynamic-input-contents' v-if='currentValue'>"
					+ "			<div v-for='i in Object.keys(currentValue)' class='dynamic-input-iteration'>"
					+ "				<template v-if='isSimpleList()'>"
					+ "					<page-form-field :key=\"field.name + '_value' + i\" :field='getSimpleField()'"
					+ "						v-model='currentValue[i]'"
					+ "						:schema='getSchemaFor()'"
					+ "						@input=\"$emit('changed')\""
					+ "						:timeout='timeout'"
					+ "						:page='page'"
					+ "						:cell='cell'/>"
					+ "				</template>"
					+ "				<template v-else>"
					//+ "					<n-form-section v-for='key in Object.keys(value[name ? name : field.name][i])' "
					+ "					<div v-for='key in getChildren()' "
					+ "							v-if=\"getField(field.name + '.' + key)\" >"
					+ "						<component v-if=\"getProvidedListComponent(field.name + '.' + key) != null\""
					+ "							:is=\"getProvidedListComponent(field.name + '.' + key)\""
					+ "							:value='currentValue[i]'"
					+ "							:page='page'"
					+ "							:cell='cell'"
					+ "							:edit='edit'"
					// once we are recursively editing lists, we are nesting them in the correct place, don't use global names
					+ "							:name='key'"
					+ "							:field=\"getField(field.name + '.' + key)\""
					+ "							@changed=\"$emit('changed')\""
					+ "							:timeout='cell.state.immediate ? 600 : 0'"
					+ "							:schema=\"getSchemaFor(key)\""
					+ "							:class=\"getField(field.name + '.' + key).group\"/>"
					+ "						<page-form-field v-else :key=\"field.name + '_value' + i + '_' + key\" :field=\"getField(field.name + '.' + key)\"" 
					+ "							:schema=\"getSchemaFor(key)\" v-model='currentValue[i][key]'"
					+ "							@input=\"$emit('changed')\""
					+ "							:timeout='timeout'"
					+ "							:page='page'"
					+ "							:cell='cell'"
					+ "							:class=\"getField(field.name + '.' + key).group\"/>"
					+ "					</div>"
					+ "				</template><span class='fa fa-times' @click='currentValue.splice(i, 1)'></span>"
					+ "		<button v-if='false' :class=\"field.buttonRemoveClass ? field.buttonRemoveClass : 'secondary'\" @click='currentValue.splice(i, 1)'>%{Remove} {{field.label ? $services.page.translate(field.label) : field.name}}</button>"
					+ "	</div>"
					+ "</div>"
					+ "<div class='dynamic-input-actions'>"
					+ "		<button :class=\"field.buttonAddClass ? field.buttonAddClass : 'primary'\" @click='addInstanceOfField'>%{Add} {{field.label ? $services.page.translate(field.label) : field.name}}</button>"
					+ "</div>"
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
		edit: {
			type: Boolean,
			required: false
		},
		name: {
			type: String,
			required: false
		}
	},
	computed: {
		// if you have a nested array (say body.fixed.ips)
		// in the past, it would be available under that exact name
		// with changes to the form engine, it could be for example "body.fixed" as a record which contains ips
		// for this reason, we do a slightly more complex lookup for the current value
		currentValue: function() {
			var path = this.name ? this.name : this.field.name;
			var original = path;
			while (path) {
				if (this.value[path]) {
					if (path != original) {
						return this.$services.page.getValue(this.value[path], original.substring(path.length + 1));
					}
					else {
						return this.value[path];
					}
				}
				var index = path.lastIndexOf(".");
				if (index > 0) {
					path = path.substring(0, index);
				}
				else {
					break;
				}
			}
			return null;
		}	
	},
	methods: {
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		},
		// currently we just assume it is a text field, in the to be we can do fancier things
		getSimpleField: function() {
			var field = nabu.utils.objects.clone(this.field);
			field.type = "text";
			return field;
		},
		addInstanceOfField: function() {
			var field = this.field;
			var name = this.name ? this.name : field.name;
			var valueToUse = this.currentValue;
			if (!valueToUse) {
				Vue.set(this.value, name, []);
				valueToUse = this.value[name];
			}
			var schema = this.schema;
			if (schema.items) {
				schema = schema.items;
			}
			var result = null;
			if (schema.properties) {
				result = {};
				Object.keys(schema.properties).map(function(key) {
					result[key] = null;
				});
			}
			valueToUse.push(result);
		},
		getChildren: function() {
			var schema = this.schema;
			if (schema.items) {
				schema = schema.items;
			}
			return Object.keys(schema.properties);
		},
		getProvidedListComponent: function(name) {
			var field = this.getField(name);
			if (!field) {
				return null;
			}
			var type = field.type;
			if (!type) {
				return null;
			}
			var provided = nabu.page.providers("page-form-list-input").filter(function(x) {
				 return x.name == type;
			})[0];
			return provided ? provided.component : null;	
		},
		isSimpleList: function() {
			// if the items consist of properties, they are complex, otherwise they are simple
			return !this.schema.items.properties;	
		},
		getSchemaFor: function(key) {
			// we want a single field in a complex list
			if (key) {
				// we want to pass in the correct required setting
				this.schema.items.properties[key].required = this.schema.items.required && this.schema.items.required.indexOf(key) >= 0;
				return this.schema.items.properties[key];
			}
			// we are using a simple list (e.g. strings)
			else {
				return this.schema.items;
			}
		},
		getField: function(name) {
			for (var i = 0; i < this.cell.state.pages.length; i++) {
				var field = this.cell.state.pages[i].fields.filter(function(x) {
					return x.name == name;
				})[0];
				if (field) {
					return field;
				}
			}
		}
	}
});