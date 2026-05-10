import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserRepository from '#users/repositories/user_repository'

test.group('BaseRepository', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should be able to get repository from container', async ({ assert }) => {
    // Arrange & Act
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    // Assert
    assert.isDefined(userRepo)
    assert.equal(typeof userRepo.findByEmail, 'function')
    assert.equal(typeof userRepo.create, 'function')
    assert.equal(typeof userRepo.findById, 'function')
  })

  test('should create a user using repository', async ({ assert }) => {
    // Arrange
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const userData = {
      email: 'test@repository.com',
      password: 'hashedpassword123',
    }

    // Act
    const user = await userRepo.create(userData as any)

    // Assert
    assert.isDefined(user)
    assert.equal(user.email, userData.email)
    assert.isDefined(user.id)
  })

  test('should find user by email using repository', async ({ assert }) => {
    // Arrange
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const userData = {
      email: 'findme@repository.com',
      password: 'hashedpassword123',
      // full_name: 'Find Me User',
    }

    // Créer l'utilisateur
    const createdUser = await userRepo.create(userData as any)

    // Act
    const foundUser = await userRepo.findByEmail(userData.email)

    // Assert
    assert.isDefined(foundUser)
    assert.equal(foundUser!.id, createdUser.id)
    assert.equal(foundUser!.email, userData.email)
  })

  test('should support soft delete functionality', async ({ assert }) => {
    // Arrange
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const userData = {
      email: 'softdelete@repository.com',
      password: 'hashedpassword123',
      // full_name: 'Soft Delete User',
    }

    // Créer l'utilisateur
    const createdUser = await userRepo.create(userData as any)
    const userId = createdUser.id

    // Act - Soft delete
    await userRepo.delete(userId, { soft: true })

    // Assert - L'utilisateur ne devrait pas être trouvé dans une recherche normale
    const normalSearch = await userRepo.findById(userId)
    assert.isNull(normalSearch)

    // Mais devrait être trouvé avec includeDeleted
    const deletedSearch = await userRepo.findById(userId, { includeDeleted: true })
    assert.isDefined(deletedSearch)
    assert.equal(deletedSearch!.id, userId)
  })

  test('should restore soft deleted user', async ({ assert }) => {
    // Arrange
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const userData = {
      email: 'restore@repository.com',
      password: 'hashedpassword123',
      // full_name: 'Restore User',
    }

    // Créer et supprimer l'utilisateur
    const createdUser = await userRepo.create(userData as any)
    const userId = createdUser.id
    await userRepo.delete(userId, { soft: true })

    // Act - Restore
    const restoredUser = await userRepo.restore(userId)

    // Assert
    assert.isDefined(restoredUser)
    assert.equal(restoredUser.id, userId)

    // Vérifier qu'il est de nouveau accessible normalement
    const normalSearch = await userRepo.findById(userId)
    assert.isDefined(normalSearch)
    assert.equal(normalSearch!.id, userId)
  })

  test('should update user using repository', async ({ assert }) => {
    // Arrange
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const userData = {
      email: 'update@repository.com',
      password: 'hashedpassword123',
    }

    // Créer l'utilisateur
    const createdUser = await userRepo.create(userData as any)
    const userId = createdUser.id

    // Act
    const updatedUser = await userRepo.update(userId, {
      email: 'updated@repository.com',
    } as any)

    // Assert
    assert.equal(updatedUser.id, userId)
    assert.equal(updatedUser.email, 'updated@repository.com')
  })
})
