<template id="wiki-menu">
	<ul class="wiki-menu">
		<template v-if="root.directories">
			<li v-for="directory in root.directories" class="directory" :class="{'open': isOpen(directory), 'closed': !isOpen(directory)}">
				<span class="title" @click="toggle(directory)"><span class="fa" :class="{'fa-chevron-right': !isOpen(directory), 'fa-chevron-down': isOpen(directory) }"></span><span class="name">{{directory.name}}</span></span>
				<wiki-menu ref="directories" :initial-open="initialChildrenOpen" v-bubble:select v-show="isOpen(directory)" :root="directory"></wiki-menu>
			</li>
		</template>
		<template v-if="root.articles">
			<li v-for="article in root.articles" class="article" @click="$emit('select', article)" :class="{'selected': $services.wiki.selected == article.path }">
				<span class="title"><span class="fa fa-circle-notch"></span><span class="name">{{article.name.replace(/\.[^.]+$/, "")}}</span></span>
			</li>
		</template>
	</ul>
</template>