"use client";

import { useFormContext } from "react-hook-form";
import type { ThemeValues } from "./schemas";

const themes = [
  {
    id: "default",
    name: "Default Theme",
    description: "Clean and simple design with classic styling",
    preview: "bg-gray-100 border-gray-300",
    features: ["Classic bubbles", "Standard colors", "Simple layout"]
  },
  {
    id: "modern",
    name: "Modern Theme", 
    description: "Sleek gradients and premium styling with rounded bubbles",
    preview: "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200",
    features: ["Gradient backgrounds", "Rounded bubbles", "Premium styling", "Mobile-optimized"]
  }
];

export function ThemeForm() {
  const form = useFormContext<ThemeValues>();
  const selectedTheme = form.watch("theme_template");

  return (
    <div className="space-y-8">
      {/* Theme Selection */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Choose Theme Template</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {themes.map((theme) => (
            <label key={theme.id} className="cursor-pointer group">
              <input
                type="radio"
                value={theme.id}
                {...form.register("theme_template")}
                className="sr-only"
              />
              <div className={`
                relative p-6 rounded-xl border-2 transition-all duration-200
                ${selectedTheme === theme.id 
                  ? 'border-indigo-500 bg-indigo-50 shadow-lg transform scale-[1.02]' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }
              `}>
                {/* Selection indicator */}
                <div className={`
                  absolute top-4 right-4 w-5 h-5 rounded-full border-2 transition-all duration-200
                  ${selectedTheme === theme.id 
                    ? 'border-indigo-500 bg-indigo-500' 
                    : 'border-gray-300 bg-white'
                  }
                `}>
                  {selectedTheme === theme.id && (
                    <div className="w-2 h-2 bg-white rounded-full absolute top-0.5 left-0.5"></div>
                  )}
                </div>

                {/* Preview */}
                <div className={`h-20 rounded-lg mb-4 ${theme.preview} flex items-center justify-center`}>
                  <div className="flex space-x-2">
                    <div className={`w-8 h-6 rounded-lg ${theme.id === 'modern' ? 'bg-gradient-to-r from-indigo-400 to-purple-400' : 'bg-gray-400'}`}></div>
                    <div className={`w-12 h-6 rounded-lg ${theme.id === 'modern' ? 'bg-gradient-to-r from-gray-600 to-gray-700' : 'bg-gray-300'}`}></div>
                  </div>
                </div>

                {/* Theme info */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">{theme.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{theme.description}</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    {theme.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Theme Customization */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Customize Appearance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Brand Color */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">Brand Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="h-10 w-16 border border-gray-300 rounded-md cursor-pointer"
                {...form.register("brand_color")}
              />
              <input
                className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                {...form.register("brand_color")}
                placeholder="#3B82F6"
              />
            </div>
            <p className="text-xs text-gray-600">Used for user message bubbles and accent colors</p>
            {form.formState?.errors?.brand_color && (
              <p className="text-xs text-red-600">{form.formState.errors.brand_color.message as string}</p>
            )}
          </div>

          {/* Avatar URL */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">Avatar URL</label>
            <input
              className="w-full border border-gray-300 rounded-md px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              placeholder="https://example.com/avatar.jpg"
              {...form.register("avatar_url")}
            />
            <p className="text-xs text-gray-600">Optional custom avatar for your chatbot</p>
          </div>

          {/* Bubble Style */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">Bubble Style</label>
            <select
              className="w-full border border-gray-300 rounded-md px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              {...form.register("bubble_style")}
            >
              <option value="rounded">Rounded</option>
              <option value="square">Square</option>
            </select>
            <p className="text-xs text-gray-600">Shape of message bubbles</p>
          </div>

          {/* Typing Indicator */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">Typing Indicator</label>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <input 
                type="checkbox" 
                {...form.register("typing_indicator")}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Show typing indicator</span>
                <p className="text-xs text-gray-600">Display "Assistant is typing..." while generating responses</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
