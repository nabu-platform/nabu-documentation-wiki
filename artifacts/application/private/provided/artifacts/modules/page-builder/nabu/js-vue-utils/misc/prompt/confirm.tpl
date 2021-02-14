<template id="n-confirm">
	<div class="n-confirm">
		<h1 class="n-confirm-title" v-if="title">{{ title }}</h1>
		<div v-if="type" class="n-confirm-icon"><span class="info n-icon fa" 
			:class="{'n-icon-question-circle-o': type == 'question', 'fa-question-circle-o': type == 'question', 'n-icon-exclamation-triangle': type == 'warning', 'fa-exclamation-triangle': type == 'warning', 'n-icon-exclamation-circle': type == 'error', 'n-icon-info-circle': type == 'info', 'fa-exclamation-circle': type == 'error', 'fa-info-circle': type == 'info' }"></span></div>
		<div class="n-confirm-content"><slot>{{ message }}</slot></div>
		<div class="n-confirm-buttons">
			<a v-if="rejectable" class="cancel" href="javascript:void(0)" @click="$reject()">{{ cancel ? cancel : '%{Cancel}' }}</a>
			<button class="primary" @click="resolve()" v-focus>{{ ok ? ok : '%{Ok}' }}</button>
		</div>
	</div>
</template>