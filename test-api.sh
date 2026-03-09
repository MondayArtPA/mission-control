#!/bin/bash

# Todo List API Test Script
# Make sure the dev server is running: npm run dev

BASE_URL="http://localhost:3000/api/todos"

echo "🚀 Testing Todo List API"
echo "========================"

# 1. Get all todos (should be empty initially)
echo -e "\n1️⃣  GET /api/todos (empty)"
curl -s $BASE_URL | jq

# 2. Create first todo
echo -e "\n2️⃣  POST /api/todos (create first)"
TODO1=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy groceries"}' | jq)
echo $TODO1
TODO1_ID=$(echo $TODO1 | jq -r '.data.id')

# 3. Create second todo
echo -e "\n3️⃣  POST /api/todos (create second)"
TODO2=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"title":"Finish Mission Control dashboard"}' | jq)
echo $TODO2
TODO2_ID=$(echo $TODO2 | jq -r '.data.id')

# 4. Get all todos (should have 2)
echo -e "\n4️⃣  GET /api/todos (2 items)"
curl -s $BASE_URL | jq

# 5. Get single todo
echo -e "\n5️⃣  GET /api/todos/$TODO1_ID"
curl -s $BASE_URL/$TODO1_ID | jq

# 6. Update todo (mark as completed)
echo -e "\n6️⃣  PUT /api/todos/$TODO1_ID (mark completed)"
curl -s -X PUT $BASE_URL/$TODO1_ID \
  -H "Content-Type: application/json" \
  -d '{"completed":true}' | jq

# 7. Update todo title
echo -e "\n7️⃣  PUT /api/todos/$TODO2_ID (update title)"
curl -s -X PUT $BASE_URL/$TODO2_ID \
  -H "Content-Type: application/json" \
  -d '{"title":"Complete Mission Control API"}' | jq

# 8. Get all todos (after updates)
echo -e "\n8️⃣  GET /api/todos (after updates)"
curl -s $BASE_URL | jq

# 9. Delete single todo
echo -e "\n9️⃣  DELETE /api/todos/$TODO1_ID"
curl -s -X DELETE $BASE_URL/$TODO1_ID | jq

# 10. Get all todos (after delete)
echo -e "\n🔟 GET /api/todos (after delete)"
curl -s $BASE_URL | jq

# 11. Test error - get non-existent todo
echo -e "\n❌ GET /api/todos/999999 (not found)"
curl -s $BASE_URL/999999 | jq

# 12. Test error - create without title
echo -e "\n❌ POST /api/todos (missing title)"
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{}' | jq

echo -e "\n✅ API Testing Complete!"
