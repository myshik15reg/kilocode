# Django Patterns

> Паттерны Django разработки

# Django Patterns

## Models

```python
from django.db import models

class User(models.Model):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return self.email

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'posts'
        ordering = ['-created_at']
```

## Views (Class-Based)

```python
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy

class UserListView(ListView):
    model = User
    template_name = 'users/list.html'
    context_object_name = 'users'
    paginate_by = 20

class UserDetailView(DetailView):
    model = User
    template_name = 'users/detail.html'
    context_object_name = 'user'

class UserCreateView(CreateView):
    model = User
    fields = ['email', 'name']
    template_name = 'users/form.html'
    success_url = reverse_lazy('user-list')

class UserUpdateView(UpdateView):
    model = User
    fields = ['email', 'name']
    template_name = 'users/form.html'
    success_url = reverse_lazy('user-list')

class UserDeleteView(DeleteView):
    model = User
    success_url = reverse_lazy('user-list')
```

## Forms

```python
from django import forms

class UserForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['email', 'name']
        widgets = {
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'name': forms.TextInput(attrs={'class': 'form-control'})
        }

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError('Email already exists')
        return email
```

---

## Best Practices

1. **Следуй официальной документации** - всегда проверяй актуальность паттернов
2. **Тестируй код** - все паттерны должны иметь unit-тесты
3. **Обрабатывай ошибки** - никогда не игнорируй исключения
4. **Логируй важные события** - для отладки и мониторинга
5. **Оптимизируй производительность** - профилируй критичные участки

## Дополнительные ресурсы

- Официальная документация
- Best practices от сообщества
- Актуальные примеры на GitHub
