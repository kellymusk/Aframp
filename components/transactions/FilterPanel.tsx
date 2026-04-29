'use client'

import React, { useState } from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

export function FilterPanel() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* The Trigger */}
      <Button onClick={() => setIsOpen(true)} variant="outline" className="gap-2">
        <Filter className="w-4 h-4" /> Filters
      </Button>

      {/* Backdrop: Essential for 'Easy Dismiss' requirement */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:bg-black/20"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* The Panel: Mobile Bottom-Sheet vs Desktop Sidebar */}
      <aside
        className={`
                fixed z-[60] bg-background shadow-xl transition-transform duration-300 ease-in-out
                /* Mobile Layout: Bottom-up slide */
                bottom-0 left-0 w-full h-[80vh] rounded-t-[2rem] border-t p-6 
                ${isOpen ? 'translate-y-0' : 'translate-y-full'}
                /* Desktop Layout: Right-to-left slide */
                md:top-0 md:right-0 md:left-auto md:w-[400px] md:h-full md:rounded-none md:border-l
                md:bottom-auto
                md:${isOpen ? 'translate-x-0' : 'translate-x-full'}
                md:translate-y-0
            `}
      >
        {/* Mobile Drag Handle: Visual cue for mobile users */}
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6 md:hidden" />

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold">Transaction Filters</h2>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Date Presets Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Quick Dates</label>
            <div className="flex flex-wrap gap-2">
              {['7 Days', '30 Days', '90 Days'].map((label) => (
                <Badge key={label} variant="secondary" className="cursor-pointer px-3 py-1">
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Manual Inputs: Addresses 'Improve slider with input fields' */}
          <div className="grid grid-cols-2 gap-4">
            <Input type="date" placeholder="From" />
            <Input type="date" placeholder="To" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-0 left-0 w-full p-6 border-t bg-background flex gap-4">
          <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
            Reset
          </Button>
          <Button className="flex-1">Apply</Button>
        </div>
      </aside>
    </>
  )
}
