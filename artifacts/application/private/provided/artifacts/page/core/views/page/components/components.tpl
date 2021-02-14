<template id="page-components-overview">
	<div class="page-components-overview">
		<div class="tabs">
			<div @click="selected = 'components'" class="tab" :class="{'selected': selected == 'components'}">Components</div>
			<div @click="selected = 'templates'" class="tab" :class="{'selected': selected == 'templates'}">Templates</div>
			<div @click="selected = 'operations'" class="tab" :class="{'selected': selected == 'operations'}">Operations</div>
		</div>
		<div v-if="selected == 'components'">
			<n-collapsible class="component-category" v-for="category in componentCategories" :title="prettyPrint(category)">
				<div class="page-component" v-for="component in getComponentCategory(category)" :draggable="true" 
						@dragstart="dragComponent($event, component)">
					<img :draggable="false" :src="'${server.root()}resources/' + component.icon" class="component-icon" v-if="component.icon"/>
					<div class="about">
						<span class="name">{{ component.name }}</span>
						<p class="component-description" v-if="component.description">{{ component.description }}</p>
					</div>
				</div>
			</n-collapsible>
		</div>
		<div v-else-if="selected == 'templates'">
			<n-collapsible class="component-category" v-for="category in templateCategories" :title="prettyPrint(category)">
				<div class="page-template" v-for="template in getTemplateCategory(category)" :draggable="true" 
						@dragstart="dragTemplate($event, template)">
					<img :draggable="false" :src="'${server.root()}resources/' + template.icon" class="component-icon" v-if="template.icon"/>
					<div class="about">
						<span class="name">{{ template.name }}</span>
						<p class="template-description" v-if="template.description">{{ template.description }}</p>
					</div>
				</div>
			</n-collapsible>
		</div>
		<div v-else-if="selected == 'operations'">
			<n-collapsible class="component-category" v-for="category in getOperationCategories()" :title="prettyPrint(category)">
				<div class="page-template" v-for="operation in getOperationCategory(category)" :draggable="true" 
						@dragstart="dragOperation($event, operation)">
					<div class="about operation">
						<span class="operation-folder">{{operationFolder(operation.id)}}</span>
						<span class="name">{{ prettyPrintOperation(operation.id) }}</span>
						<p class="template-description" v-if="operation.summary">{{ operation.summary }}</p>
					</div>
				</div>
			</n-collapsible>
		</div>
	</div>
</template>


<template id="page-components-selector">
	<div class="page-components-selector">
		<h2>Select Component</h2>
		<div class="page-components">
			<div class="page-component" v-for="component in components" @click="$resolve(component)">
				<img :src="'${server.root()}resources/' + component.icon" class="component-icon" v-if="component.icon"/>
				<div class="about">
					<span class="name">{{ component.name }}</span>
					<p class="component-description" v-if="component.description">{{ component.description }}</p>
				</div>
			</div>
		</div>
		<div class="buttons">
			<button @click="$reject()">Cancel</button>
		</div>
	</div>
</template>