<template>
  <footer class="bg-gray-900 text-white">
    <div class="container mx-auto px-4 py-12">
      <div class="grid md:grid-cols-4 gap-8">
        <div class="col-span-1">
          <div class="flex items-center space-x-2 mb-4">
            <UIcon name="i-heroicons-envelope" class="w-8 h-8 text-blue-400" />
            <span class="text-xl font-bold">Vahan</span>
          </div>
          <p class="text-gray-400 text-sm">
            Professional email infrastructure powered by AWS SES for reliable, scalable email delivery.
          </p>
        </div>
        
        <div>
          <h3 class="font-semibold mb-4">Product</h3>
          <ul class="space-y-2 text-sm text-gray-400">
            <li><NuxtLink to="/features" class="hover:text-white">Features</NuxtLink></li>
            <li><NuxtLink to="/pricing" class="hover:text-white">Pricing</NuxtLink></li>
            <li><NuxtLink to="/security" class="hover:text-white">Security</NuxtLink></li>
            <li><NuxtLink to="/integrations" class="hover:text-white">Integrations</NuxtLink></li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold mb-4">Resources</h3>
          <ul class="space-y-2 text-sm text-gray-400">
            <li><NuxtLink to="/docs" class="hover:text-white">Documentation</NuxtLink></li>
            <li><NuxtLink to="/blog" class="hover:text-white">Blog</NuxtLink></li>
            <li><NuxtLink to="/support" class="hover:text-white">Support</NuxtLink></li>
            <li><NuxtLink to="/status" class="hover:text-white">Status</NuxtLink></li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold mb-4">Company</h3>
          <ul class="space-y-2 text-sm text-gray-400">
            <li><NuxtLink to="/about" class="hover:text-white">About</NuxtLink></li>
            <li><NuxtLink to="/privacy" class="hover:text-white">Privacy</NuxtLink></li>
            <li><NuxtLink to="/terms" class="hover:text-white">Terms</NuxtLink></li>
            <li><NuxtLink to="/contact" class="hover:text-white">Contact</NuxtLink></li>
          </ul>
        </div>
      </div>
      
      <div class="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
        <p class="text-gray-400 text-sm">
          © {{ currentYear }} Vahan Email Platform. All rights reserved.
        </p>
        <div class="flex space-x-6 mt-4 md:mt-0">
          <a href="https://twitter.com" class="text-gray-400 hover:text-white">
            <UIcon name="i-simple-icons-twitter" class="w-5 h-5" />
          </a>
          <a href="https://github.com" class="text-gray-400 hover:text-white">
            <UIcon name="i-simple-icons-github" class="w-5 h-5" />
          </a>
          <a href="https://linkedin.com" class="text-gray-400 hover:text-white">
            <UIcon name="i-simple-icons-linkedin" class="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
const currentYear = new Date().getFullYear()
</script>
