
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const businessTips = [
      "Track your cash flow regularly to maintain healthy business finances",
      "Build strong relationships with your customers through personalized service",
      "Keep your inventory lean to minimize storage costs",
      "Invest in digital marketing to reach more customers",
      "Implement a customer loyalty program",
      "Regularly analyze your sales data to identify trends",
      "Focus on customer retention as much as acquisition",
      "Stay updated with industry trends and adapt accordingly",
      "Maintain a strong online presence",
      "Consider offering early payment discounts",
    ];

    const randomTip = businessTips[Math.floor(Math.random() * businessTips.length)];

    return new Response(
      JSON.stringify({ tip: randomTip }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
