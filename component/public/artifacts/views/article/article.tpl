<template id="wiki-article-container">
	<div class="wiki-article-container">
		<div class="wiki-article" v-html="content"></div>
		<wiki-toc :items="items" @select="activate" v-if="items && items.length" :root="true"/>
		<div v-show="showInline" class="inline-article" ref="inline" v-auto-close="function() { showInline = false }"></div>
	</div>
</template>

<template id="wiki-toc">
	<ul class="wiki-toc">
		<li v-if="root" class="toc-explanation">%{Table of contents}</li>
		<li v-for="item in items">
			<span class="wiki-toc-title" @click="$emit('select', item)">{{item.title}}</span>
			<wiki-toc v-if="item.children.length" :items="item.children" v-bubble:select/>
		</li>
	</ul>
</template>