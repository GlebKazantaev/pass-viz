from collections import defaultdict


class NestedDict(defaultdict):
    def __init__(self, args):
        super().__init__(args)
        self._custom_properties = {}

    @property
    def props(self):
        return self._custom_properties

    @props.setter
    def props(self, value):
        self._custom_properties = value


def nested_dict():
    return NestedDict(nested_dict)
