"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"

// Mock data - would be fetched from API in real implementation
const mockSettings = {
  defaultView: "week",
  workWeek: true,
  weekStartsOn: "sunday",
  showWeekNumbers: false,
  autoSchedule: true,
  schedulingPreference: "morning",
  tweetThreadBuffer: 1, // days
  maxDailyPosts: 2,
  timeSlots: {
    morning: true,
    afternoon: true,
    evening: true,
  },
  notifications: {
    upcoming: true,
    published: true,
    failed: true,
  }
}

export function CalendarSettings() {
  const [settings, setSettings] = useState(mockSettings)
  
  const handleSwitchChange = (name: string, checked: boolean) => {
    setSettings(prev => ({ ...prev, [name]: checked }))
  }
  
  const handleTimeSlotChange = (slot: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      timeSlots: {
        ...prev.timeSlots,
        [slot]: checked
      }
    }))
  }
  
  const handleNotificationChange = (type: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [type]: checked
      }
    }))
  }
  
  const handleSelectChange = (name: string, value: string) => {
    setSettings(prev => ({ ...prev, [name]: value }))
  }
  
  const handleSliderChange = (name: string, value: number[]) => {
    setSettings(prev => ({ ...prev, [name]: value[0] }))
  }
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="defaultView">Default View</Label>
        <Select
          value={settings.defaultView}
          onValueChange={(value) => handleSelectChange("defaultView", value)}
        >
          <SelectTrigger id="defaultView">
            <SelectValue placeholder="Select default view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="day">Day</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="weekStartsOn">Week Starts On</Label>
        <Select
          value={settings.weekStartsOn}
          onValueChange={(value) => handleSelectChange("weekStartsOn", value)}
        >
          <SelectTrigger id="weekStartsOn">
            <SelectValue placeholder="Select first day of week" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sunday">Sunday</SelectItem>
            <SelectItem value="monday">Monday</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center justify-between">
        <Label htmlFor="workWeek">Show Work Week Only</Label>
        <Switch
          id="workWeek"
          checked={settings.workWeek}
          onCheckedChange={(checked) => handleSwitchChange("workWeek", checked)}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <Label htmlFor="showWeekNumbers">Show Week Numbers</Label>
        <Switch
          id="showWeekNumbers"
          checked={settings.showWeekNumbers}
          onCheckedChange={(checked) => handleSwitchChange("showWeekNumbers", checked)}
        />
      </div>
      
      <Separator />
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Scheduling Settings</h3>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="autoSchedule">Auto-Schedule Content</Label>
          <Switch
            id="autoSchedule"
            checked={settings.autoSchedule}
            onCheckedChange={(checked) => handleSwitchChange("autoSchedule", checked)}
          />
        </div>
        
        <div className="space-y-2 pt-2">
          <Label htmlFor="schedulingPreference">Scheduling Preference</Label>
          <Select
            value={settings.schedulingPreference}
            onValueChange={(value) => handleSelectChange("schedulingPreference", value)}
            disabled={!settings.autoSchedule}
          >
            <SelectTrigger id="schedulingPreference">
              <SelectValue placeholder="Select preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Morning (8am-12pm)</SelectItem>
              <SelectItem value="afternoon">Afternoon (12pm-5pm)</SelectItem>
              <SelectItem value="evening">Evening (5pm-9pm)</SelectItem>
              <SelectItem value="distributed">Evenly Distributed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        
        <div className="space-y-2 pt-2">
          <div className="flex justify-between">
            <Label>Tweet Thread Buffer (days): {settings.tweetThreadBuffer}</Label>
          </div>
          <Slider
            defaultValue={[settings.tweetThreadBuffer]}
            max={3}
            min={0}
            step={1}
            onValueChange={(value) => handleSliderChange("tweetThreadBuffer", value)}
            disabled={!settings.autoSchedule}
          />
          <div className="text-xs text-muted-foreground">
            Minimum days between tweet threads
          </div>
        </div>
        
        <div className="space-y-2 pt-2">
          <div className="flex justify-between">
            <Label>Maximum Daily Posts: {settings.maxDailyPosts}</Label>
          </div>
          <Slider
            defaultValue={[settings.maxDailyPosts]}
            max={5}
            min={1}
            step={1}
            onValueChange={(value) => handleSliderChange("maxDailyPosts", value)}
            disabled={!settings.autoSchedule}
          />
        </div>
      </div>
      
      <Separator />
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Time Slots</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="morning">Morning (8am-12pm)</Label>
            <Switch
              id="morning"
              checked={settings.timeSlots.morning}
              onCheckedChange={(checked) => handleTimeSlotChange("morning", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="afternoon">Afternoon (12pm-5pm)</Label>
            <Switch
              id="afternoon"
              checked={settings.timeSlots.afternoon}
              onCheckedChange={(checked) => handleTimeSlotChange("afternoon", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="evening">Evening (5pm-9pm)</Label>
            <Switch
              id="evening"
              checked={settings.timeSlots.evening}
              onCheckedChange={(checked) => handleTimeSlotChange("evening", checked)}
            />
          </div>
        </div>
      </div>
      
      <Separator />
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Notifications</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="upcoming">Upcoming Content</Label>
            <Switch
              id="upcoming"
              checked={settings.notifications.upcoming}
              onCheckedChange={(checked) => handleNotificationChange("upcoming", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="published">Published Content</Label>
            <Switch
              id="published"
              checked={settings.notifications.published}
              onCheckedChange={(checked) => handleNotificationChange("published", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="failed">Failed Publications</Label>
            <Switch
              id="failed"
              checked={settings.notifications.failed}
              onCheckedChange={(checked) => handleNotificationChange("failed", checked)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
