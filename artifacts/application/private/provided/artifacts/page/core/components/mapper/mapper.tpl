<template id="n-page-mapper">
	<n-form-section>
		<n-form-section v-for="field in fieldsToMap">
			<n-form-combo :label="'Map to ' + field" :labels="sources" :filter="fieldsFrom" 
				class="vertical"
				:value="getValueFor(field)"
				:initial-label="getLabelFor(field)"
				@input="function(newValue, label) { setValue(field, newValue, label) }"/>
			
			<n-form-switch v-model="value[field].lambda" label="As lambda" 
				v-if="isLambdable(field)"/>

			<n-collapsible :title="'Mapping for: ' + getValueFor(field)" v-if="getLabelFor(field) == '$function'">
				<n-page-mapper 
					v-if="true || !value[field].lambda"
					:to="$services.page.getFunctionInput(getValueFor(field))" 
					:from="from"
					v-model="getBindingsFor(field)"/>
				<n-form-combo label="Output field"
					:filter="$services.page.getFunctionOutput.bind($self, getValueFor(field))"
					v-model="getObjectFor(field).output"/>
			</n-collapsible>
		</n-form-section>
	</n-form-section>
</template>