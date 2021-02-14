<template id="n-collapsible">
	<div class="n-collapsible" :class="{ 'n-collapsible-show': show }">
		<h3 class="n-collapsible-title" @click="toggle()"><span :class="{ 'n-icon-chevron-right': !show, 'n-icon-chevron-down': show, 'fa-chevron-right': !show, 'fa-chevron-down': show}" class="n-icon fa"></span><span v-if="before" class="n-collapsible-title-before">{{before}}</span><span class="n-collapsible-title-content" v-if="title">{{ title }}</span><span v-if="after" class="n-collapsible-title-after">{{after}}</span><span class="n-collapsible-title-buttons" @mouseover="toggleable=false" @mouseout="toggleable=true"><slot name="buttons"></slot></span></h3>
		<div class="n-icon-spinner spinner" v-if="loading"></div>
		<div class="n-collapsible-content" v-if="show">
			<slot></slot>
		</div>
	</div>
</template>
