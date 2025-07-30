<template>
  <header class="bg-white shadow-sm border-b">
    <div class="container mx-auto px-4">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center space-x-4">
          <NuxtLink to="/" class="flex items-center space-x-2">
            <UIcon name="i-heroicons-envelope" class="w-8 h-8 text-blue-600" />
            <span class="text-xl font-bold text-gray-900">Vahan</span>
          </NuxtLink>
        </div>
        
        <nav class="hidden md:flex items-center space-x-8">
          <NuxtLink to="/features" class="text-gray-600 hover:text-gray-900">
            Features
          </NuxtLink>
          <NuxtLink to="/pricing" class="text-gray-600 hover:text-gray-900">
            Pricing
          </NuxtLink>
          <NuxtLink to="/docs" class="text-gray-600 hover:text-gray-900">
            Documentation
          </NuxtLink>
        </nav>
        
        <div class="flex items-center space-x-4">
          <template v-if="user">
            <UDropdown :items="userMenuItems">
              <UButton variant="ghost" class="flex items-center space-x-2">
                <UAvatar 
                  :alt="user.firstName || user.email" 
                  size="sm"
                />
                <span class="hidden md:block">{{ user.firstName || user.email }}</span>
                <UIcon name="i-heroicons-chevron-down-20-solid" class="w-4 h-4" />
              </UButton>
            </UDropdown>
          </template>
          
          <template v-else>
            <UButton to="/auth/login" variant="ghost">
              Sign In
            </UButton>
            <UButton to="/auth/register">
              Get Started
            </UButton>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
// TODO: Replace with actual auth state management
const user = ref(null)

const userMenuItems = [
  [{
    label: 'Dashboard',
    icon: 'i-heroicons-squares-2x2',
    to: '/dashboard'
  }, {
    label: 'Settings',
    icon: 'i-heroicons-cog-6-tooth',
    to: '/settings'
  }], [{
    label: 'Sign Out',
    icon: 'i-heroicons-arrow-right-on-rectangle',
    click: () => signOut()
  }]
]

const signOut = async () => {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/')
  } catch (error) {
    console.error('Sign out error:', error)
  }
}

// TODO: Check authentication status on mount
onMounted(async () => {
  try {
    const userData = await $fetch('/api/auth/me')
    user.value = userData
  } catch (error) {
    // User not authenticated
  }
})
</script>
