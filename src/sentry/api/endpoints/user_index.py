from __future__ import absolute_import

from rest_framework import serializers, status
from rest_framework.response import Response
from django.db import IntegrityError

from sentry.api.base import DocSection, Endpoint
from sentry.api.serializers import serialize
from sentry.api.decorators import sudo_required
from sentry.models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')


class UserIndexEndpoint(Endpoint):
    doc_section = DocSection.ACCOUNTS
    permission_classes = ()

    def get(self, request):
        """
        Return an empty list.
        """
        return Response({})

    @sudo_required
    def post(self, request):
        """
        Create a new user.


            {method} {path}
            {{
                "id": "1",
                "name": "",
                "email": "username@example.com",
                "avatarURL": "",
            }}

        """
        serializer = UserSerializer(data=request.DATA)

        if serializer.is_valid():
            result = serializer.object
            user_id = request.DATA.get('id', None)
            # print user_id
            # print result.username
            # print result.password

            try:
                user = User.objects.create(
                        id=user_id,
                        username=result.username,
                        email=result.username,
                       )
            except IntegrityError:
                # Id already exist
                return Response({"id": ["User with this id #%s already exists." % user_id]},
                                status=status.HTTP_400_BAD_REQUEST)

            else:
                user.set_password(result.password)
                user.save()

            return Response(serialize(user, request.user), status=201)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
