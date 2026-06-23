import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://oqprdoluwpnykyrvvbmo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xcHJkb2x1d3BueWt5cnZ2Ym1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNjMxOTEsImV4cCI6MjA5NzczOTE5MX0.__LI-0wRxpLUedh1RIgvm0Tz5X42_daplETCs2MFOjA'
)
